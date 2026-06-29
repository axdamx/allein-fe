import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { retrieveContext } from '@/server/documents.server'
import { getAgentByType } from '@/mastra'
import type { SupabaseClient } from '@supabase/supabase-js'

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

export interface SendMessageResult {
  reply: string
  toolCalls: Array<{
    name: string
    success: boolean
    message: string
  }>
}

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

export async function sendMessageImpl(input: {
  conversationId: string
  content: string
}): Promise<SendMessageResult | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

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

  let systemPrompt = agent.system_prompt
  if (!systemPrompt) {
    const { data: agentType } = await supabase
      .from('agent_types')
      .select('system_prompt')
      .eq('key', agent.type)
      .single()
    systemPrompt = agentType?.system_prompt ?? ''
  }

  const { data: msgCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', input.conversationId)
  const isFirst = (msgCount?.length ?? 0) === 0

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
The following is from the user's uploaded documents. ALWAYS check this context before saying you don't know something:

${contextText}

## End of Knowledge Base Context`
  }

  const userContext = await buildUserContext(user.id, supabase)

  const dynamicPrompt = `${systemPrompt ? `## Custom Instructions\n${systemPrompt}\n\n` : ''}${userContext}${ragContext}

## Tools
You have tools to create leads, reminders, tasks, and send messages.

!!! ABSOLUTE RULE: NEVER ask the user for details that exist in this conversation. Immediately call the appropriate tool with whatever you already know. !!!

Example:
User: "who has birthday" → return client info
User: "create a lead, planner and reminder" → call all three tools IMMEDIATELY with the info from the previous turn. No questions. No summaries. Just call the tools.

Rule: Call the tool first, explain later. Never ask "what details?" — use what you already know.`

  const mastraAgent = getAgentByType(agent.type)
  if (!mastraAgent) {
    return { error: `Agent type "${agent.type}" not found` }
  }

  const result = await mastraAgent.generate(
    [
      { role: 'system' as const, content: dynamicPrompt },
      { role: 'user' as const, content: input.content },
    ],
    {
      memory: {
        resource: user.id,
        thread: input.conversationId,
      },
      maxSteps: 3,
    },
  )

  const replyText = result.text

  const toolCalls: SendMessageResult['toolCalls'] = []
  const steps = result.steps ?? []
  for (const step of steps) {
    const toolResults = (step as any).toolResults ?? []
    for (const tr of toolResults) {
      const output = tr.output ?? tr.result ?? {}
      toolCalls.push({
        name: tr.toolName ?? tr.name ?? 'unknown',
        success: output?.success !== false,
        message: output?.message ?? output?.error ?? 'Completed',
      })
    }
  }

  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'assistant',
    content: replyText,
    model: agent.model,
    tokens_in: result.usage?.inputTokens ?? 0,
    tokens_out: result.usage?.outputTokens ?? 0,
  })

  if (isFirst) {
    const title =
      input.content.length > 60
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

  const { data: agent } = await supabase
    .from('agents')
    .select('id, type, name, system_prompt, model')
    .eq('id', input.agentId)
    .single()

  if (!agent) return { error: 'Agent not found' }

  let systemPrompt = agent.system_prompt
  if (!systemPrompt) {
    const { data: agentType } = await supabase
      .from('agent_types')
      .select('system_prompt')
      .eq('key', agent.type)
      .single()
    systemPrompt = agentType?.system_prompt ?? ''
  }

  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'user',
    content: input.content,
  })

  const { data: msgCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', input.conversationId)
  const isFirst = (msgCount?.length ?? 0) === 1

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
The following is from the user's uploaded documents. ALWAYS check this context before saying you don't know something:

${contextText}

## End of Knowledge Base Context`
  }

  const userContext = await buildUserContext(input.ownerId, supabase)

  const dynamicPrompt = `${systemPrompt ? `## Custom Instructions\n${systemPrompt}\n\n` : ''}${userContext}${ragContext}

## Tools
You have tools to create leads, reminders, tasks, and send messages.

!!! ABSOLUTE RULE: NEVER ask the user for details that exist in this conversation. Immediately call the appropriate tool with whatever you already know. !!!

Rule: Call the tool first, explain later. Never ask "what details?" — use what you already know.`

  const { getAgentByType } = await import('@/mastra')
  const mastraAgent = getAgentByType(agent.type)
  if (!mastraAgent) {
    return { error: `Agent type "${agent.type}" not found` }
  }

  const result = await mastraAgent.generate(
    [
      { role: 'system' as const, content: dynamicPrompt },
      { role: 'user' as const, content: input.content },
    ],
    {
      memory: {
        resource: input.ownerId,
        thread: input.conversationId,
      },
      maxSteps: 3,
    },
  )

  const replyText = result.text

  const toolCalls: SendMessageResult['toolCalls'] = []
  const steps = result.steps ?? []
  for (const step of steps) {
    const toolResults = (step as any).toolResults ?? []
    for (const tr of toolResults) {
      const output = tr.output ?? tr.result ?? {}
      toolCalls.push({
        name: tr.toolName ?? tr.name ?? 'unknown',
        success: output?.success !== false,
        message: output?.message ?? output?.error ?? 'Completed',
      })
    }
  }

  await supabase.from('messages').insert({
    conversation_id: input.conversationId,
    role: 'assistant',
    content: replyText,
    model: agent.model,
    tokens_in: result.usage?.inputTokens ?? 0,
    tokens_out: result.usage?.outputTokens ?? 0,
  })

  if (isFirst) {
    const title =
      input.content.length > 60
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
