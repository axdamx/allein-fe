/**
 * Server-only implementation for the AI chat module.
 *
 * Uses Vercel AI SDK (streamText + tool calling) for:
 * - Native token streaming
 * - Structured tool calls (no more JSON parsing / regex fallback)
 * - Guaranteed parameter extraction from conversation context
 *
 * Also handles: RAG retrieval, conversation persistence, auto-titling.
 */
import { generateText, stepCountIs } from 'ai'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { getDefaultModel } from '@/lib/ai-provider'
import { agentTools } from '@/server/chat-tools'
import { retrieveContext } from '@/server/documents.server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationRow {
  id: string
  agent_id: string
  owner_id: string
  title: string
  summary: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tokens_in: number | null
  tokens_out: number | null
  model: string | null
  created_at: string
}

/** Result of sending a message — includes any tool calls that were made. */
export interface SendMessageResult {
  reply: string
  toolCalls: Array<{
    name: string
    success: boolean
    message: string
  }>
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversationsImpl(
  agentId?: string,
): Promise<ConversationRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('conversations')
    .select('*')
    .eq('owner_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (agentId) query = query.eq('agent_id', agentId)

  const { data, error } = await query
  if (error || !data) return []
  return data as unknown as ConversationRow[]
}

export async function createConversationImpl(input: {
  agentId: string
  title?: string
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      owner_id: user.id,
      agent_id: input.agentId,
      title: input.title ?? 'New conversation',
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await supabase.rpc('increment_usage', {
    p_user_id: user.id,
    p_metric: 'conversations_count',
    p_amount: 1,
  })

  try {
    await supabase.rpc('increment_agent_conversation', {
      p_agent_id: input.agentId,
    })
  } catch {
    // non-critical
  }

  return { id: data.id }
}

export async function deleteConversationImpl(
  conversationId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
  if (error) return { error: error.message }
  return null
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function getMessagesImpl(
  conversationId: string,
): Promise<MessageRow[]> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as unknown as MessageRow[]
}

/**
 * Send a message and get the AI response using Vercel AI SDK.
 *
 * Uses generateText (non-streaming but with tool calling) because TanStack
 * Start's createServerFn returns JSON, not a stream. The client reveals the
 * response progressively for a typing UX.
 *
 * Key improvement over the manual approach:
 * - Tools are native (LLM calls them with typed params — no JSON parsing)
 * - Context resolution is automatic (LLM reads conversation history)
 * - No regex fallback needed
 */
export async function sendMessageImpl(input: {
  conversationId: string
  content: string
}): Promise<SendMessageResult | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Verify conversation ownership + load agent
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, agent_id, owner_id')
    .eq('id', input.conversationId)
    .single()

  if (!conversation || conversation.owner_id !== user.id) {
    return { error: 'Conversation not found' }
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('id, type, name, system_prompt, model')
    .eq('id', conversation.agent_id)
    .single()

  if (!agent) return { error: 'Agent not found' }

  // Load system prompt (agent override → agent type default)
  let systemPrompt = agent.system_prompt
  if (!systemPrompt) {
    const { data: agentType } = await supabase
      .from('agent_types')
      .select('system_prompt')
      .eq('key', agent.type)
      .single()
    systemPrompt = agentType?.system_prompt ?? 'You are a helpful AI assistant.'
  }

  // 2. Load conversation history (last 20 messages, user + assistant only)
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', input.conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  const isFirstMessage = (history?.length ?? 0) === 0

  // 3. Save user message
  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'user',
    content: input.content,
  })

  await supabase.rpc('increment_usage', {
    p_user_id: user.id,
    p_metric: 'messages_count',
    p_amount: 1,
  })

  // 4. RAG: Retrieve relevant context from knowledge base
  const relevantChunks = await retrieveContext(input.content, agent.id, 5)

  let ragContext = ''
  if (relevantChunks.length > 0) {
    const contextText = relevantChunks
      .map(
        (c, i) =>
          `[Source ${i + 1}] (relevance: ${Math.round(c.similarity * 100)}%)\n${c.content}`,
      )
      .join('\n\n---\n\n')
    ragContext = `\n\n## Knowledge Base Context
The following is from the user's uploaded documents. This is YOUR data — the user expects you to know it. ALWAYS check this context before saying you don't know something. If the answer is anywhere below, use it:

${contextText}

## End of Knowledge Base Context`
  }

  const fullSystemPrompt = `${systemPrompt}${ragContext}

## About tools
You have tools available to create leads and reminders. When the user asks you to save/add/record a contact, call the createLead tool with the details from the conversation. Resolve references like "this email" or "that person" to their actual values from the conversation history. Do NOT claim you've done something before calling the tool — call the tool and report its result.`

  // 5. Build messages for the AI SDK
  const coreMessages = [
    ...(history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    { role: 'user' as const, content: input.content },
  ]

  // 6. Call the LLM with tools (native tool calling)
  const model = getDefaultModel()
  const result = await generateText({
    model,
    system: fullSystemPrompt,
    messages: coreMessages,
    tools: agentTools,
    stopWhen: stepCountIs(3), // allow multi-step tool calls (call → see result → respond)
    temperature: 0.7,
    maxOutputTokens: 4096,
  })

  const replyText = result.text

  // 7. Collect tool call results (if any tools were called)
  const toolCalls: SendMessageResult['toolCalls'] = []
  for (const step of result.steps) {
    for (const tr of step.toolResults) {
      // tr.output is typed by the tool's execute return
      const output = tr.output as {
        success?: boolean
        message?: string
        error?: string
      }
      toolCalls.push({
        name: tr.toolName,
        success: output?.success !== false,
        message: output?.message ?? output?.error ?? 'Completed',
      })
    }
  }

  // 8. Save assistant message
  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'assistant',
    content: replyText,
    model: agent.model,
  })

  // 9. Auto-generate title for new conversations
  if (isFirstMessage) {
    try {
      const titleResult = await generateText({
        model: getDefaultModel(),
        system:
          'Generate a short 3-5 word title for this conversation based on the user message. Return only the title, no quotes.',
        messages: [{ role: 'user', content: input.content }],
        maxOutputTokens: 30,
        temperature: 0.3,
      })
      await supabase
        .from('conversations')
        .update({
          title: titleResult.text.trim().replace(/["']/g, ''),
        })
        .eq('id', input.conversationId)
    } catch {
      // Title generation is best-effort
    }
  }

  // Invalidate leads/reminders queries if tools were called
  if (toolCalls.length > 0) {
    // The client will refetch these
  }

  return {
    reply: replyText,
    toolCalls,
  }
}
