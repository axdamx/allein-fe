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
import type { SupabaseClient } from '@supabase/supabase-js'

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

/**
 * Fetch the user's profile and build a context string to inject into the
 * system prompt so the AI agent knows who it's talking to.
 */
async function buildUserContext(
  userId: string,
  supabase: SupabaseClient,
): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, company, phone, plan, telegram_chat_id')
    .eq('id', userId)
    .single()

  if (!profile) return ''

  const parts: string[] = []
  if (profile.full_name) parts.push(`Name: ${profile.full_name}`)
  if (profile.email) parts.push(`Email: ${profile.email}`)
  if (profile.company) parts.push(`Company: ${profile.company}`)
  if (profile.phone) parts.push(`Phone: ${profile.phone}`)
  if (profile.plan) parts.push(`Plan: ${profile.plan}`)
  if (profile.telegram_chat_id) parts.push(`Telegram chat ID: ${profile.telegram_chat_id}`)

  if (parts.length === 0) return ''

  return `\n\n## User Context
This is the person you are talking to. Use this information to personalise responses, fill in details when creating leads, and understand their business:

${parts.join('\n')}

Always refer to them by their name if available. When creating leads or reminders, use their company as default if the user doesn't specify one.
## End of User Context`
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
 * Detect if the user wants to create records and build a nudge message
 * that forces the LLM to act on conversation context instead of asking.
 */
function buildCreateNudge(content: string): string | null {
  const createPattern = /\b(create|make|add|save|set up|setup)\b/i
  const recordType = /\b(lead|reminder|task|planner|todo|to-?do)\b/i
  if (!createPattern.test(content) && !recordType.test(content)) return null

  return `[INSTRUCTION: The user just asked to create records. Look at the conversation history above — specifically any recently mentioned person, their name, email, company, and relevant dates. Call the appropriate tools (createLead, createReminder, createTask) IMMEDIATELY with those details. DO NOT ask the user for information already discussed. DO NOT write a summary first. Call the tools now.]`
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

  // 5. Inject user context so the agent knows who it's talking to
  const userContext = await buildUserContext(user.id, supabase)

  const fullSystemPrompt = `${systemPrompt}${userContext}${ragContext}

## Tools
You have tools to create leads, reminders, tasks, and send messages.

!!! ABSOLUTE RULE: NEVER ask the user for details that exist in this conversation. Immediately call the appropriate tool with whatever you already know. !!!

When user says "create" after discussing a specific person/event, you MUST:
1. Call createLead with that person's name, email, company from chat
2. Call createReminder with a descriptive title and the relevant date
3. Call createTask with a relevant title

Example — DO THIS EXACTLY:
User: "who has birthday" → you: return client info
User: "create a lead, planner and reminder" → you: call all three tools IMMEDIATELY with the info from the previous turn. No questions. No summaries. Just call the tools.

Rule: Call the tool first, explain later. Never ask "what details?" — use what you already know.`

  // 6. Build messages for the AI SDK
  const createNudge = buildCreateNudge(input.content)

  const coreMessages = [
    ...(history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ...(createNudge ? [{ role: 'system' as const, content: createNudge }] : []),
    { role: 'user' as const, content: input.content },
  ]

  // 7. Call the LLM with tools (native tool calling)
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

  // 8. Collect tool call results (if any tools were called)
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

  // 9. Save assistant message with token usage
  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'assistant',
    content: replyText,
    model: agent.model,
    tokens_in: result.usage.inputTokens ?? 0,
    tokens_out: result.usage.outputTokens ?? 0,
  })

  // 10. Auto-generate title for new conversations
  if (isFirstMessage) {
    const title = input.content.length > 60
      ? input.content.slice(0, 57) + '...'
      : input.content
    await supabase
      .from('conversations')
      .update({ title })
      .eq('id', input.conversationId)
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

/**
 * Send a message on behalf of a user (for webhooks — no cookie session).
 *
 * Uses the service-role Supabase client to bypass RLS, so the caller must
 * pass a verified `ownerId`. This is the same AI processing as sendMessageImpl
 * but designed for Telegram / WhatsApp inbound webhooks.
 */
export async function sendMessageForOwnerImpl(input: {
  ownerId: string
  agentId: string
  conversationId: string
  content: string
}): Promise<SendMessageResult | { error: string }> {
  const { getSupabaseServiceClient } = await import(
    '@/lib/supabase/service.server'
  )
  const supabase = getSupabaseServiceClient()

  // 1. Load agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, type, name, system_prompt, model')
    .eq('id', input.agentId)
    .single()

  if (!agent) return { error: 'Agent not found' }

  // Load system prompt
  let systemPrompt = agent.system_prompt
  if (!systemPrompt) {
    const { data: agentType } = await supabase
      .from('agent_types')
      .select('system_prompt')
      .eq('key', agent.type)
      .single()
    systemPrompt = agentType?.system_prompt ?? 'You are a helpful AI assistant.'
  }

  // 2. Save user message
  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'user',
    content: input.content,
  })

  // 3. Load conversation history
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', input.conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  const isFirstMessage = (history?.filter((m: { role: string }) => m.role === 'user').length ?? 0) === 1

  // 4. RAG
  const { retrieveContext } = await import('@/server/documents.server')
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

  // 5. Inject user context
  const userContext = await buildUserContext(input.ownerId, supabase)

  const fullSystemPrompt = `${systemPrompt}${userContext}${ragContext}

## Tools
You have tools to create leads, reminders, tasks, and send messages.

!!! ABSOLUTE RULE: NEVER ask the user for details that exist in this conversation. Immediately call the appropriate tool with whatever you already know. !!!

When user says "create" after discussing a specific person/event, you MUST:
1. Call createLead with that person's name, email, company from chat
2. Call createReminder with a descriptive title and the relevant date
3. Call createTask with a relevant title

Example — DO THIS EXACTLY:
User: "who has birthday" → you: return client info
User: "create a lead, planner and reminder" → you: call all three tools IMMEDIATELY with the info from the previous turn. No questions. No summaries. Just call the tools.

Rule: Call the tool first, explain later. Never ask "what details?" — use what you already know.`

  // 6. Build messages for AI
  const createNudge = buildCreateNudge(input.content)

  const coreMessages = [
    ...(history ?? [])
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ...(createNudge ? [{ role: 'system' as const, content: createNudge }] : []),
    { role: 'user' as const, content: input.content },
  ]

  // 7. Call LLM
  const { getDefaultModel } = await import('@/lib/ai-provider')
  const model = getDefaultModel()
  const result = await generateText({
    model,
    system: fullSystemPrompt,
    messages: coreMessages,
    tools: agentTools,
    stopWhen: stepCountIs(3),
    temperature: 0.7,
    maxOutputTokens: 4096,
  })

  const replyText = result.text

  // 8. Collect tool results
  const toolCalls: SendMessageResult['toolCalls'] = []
  for (const step of result.steps) {
    for (const tr of step.toolResults) {
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

  // 9. Save assistant message with token usage
  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'assistant',
    content: replyText,
    model: agent.model,
    tokens_in: result.usage.inputTokens ?? 0,
    tokens_out: result.usage.outputTokens ?? 0,
  })

  // 10. Auto-title
  if (isFirstMessage) {
    const title = input.content.length > 60
      ? input.content.slice(0, 57) + '...'
      : input.content
    await supabase
      .from('conversations')
      .update({ title })
      .eq('id', input.conversationId)
  }

  return {
    reply: replyText,
    toolCalls,
  }
}
