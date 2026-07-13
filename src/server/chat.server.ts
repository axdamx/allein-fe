import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { retrieveContext } from '@/server/documents.server'
import { getAgentByType } from '@/mastra'
import { consumeQuota } from '@/server/profile.server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeSupabaseMessage, safeError } from '@/server/_errors'

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
  attachment_url: string | null
  attachment_mime: string | null
  attachment_name: string | null
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
  /** Updated daily-quota state after this message. Client merges this into plan state. */
  quota?: {
    used: number
    remaining: number | null
    max: number | null
    resetAt: string
  }
}

/** Returned when the user's daily message quota is exhausted. */
export interface SendMessageLimitResult {
  error: 'daily_message_limit_reached'
  remaining: number
  max: number | null
  resetAt: string
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

  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }

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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('owner_id', user.id)
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }
  return null
}

export async function getMessagesImpl(
  conversationId: string,
): Promise<MessageRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  // Verify ownership of the parent conversation before returning messages.
  const { data: convo } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!convo) return []
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
  attachmentUrl?: string | null
  attachmentMime?: string | null
  attachmentFileName?: string | null
}): Promise<SendMessageResult | SendMessageLimitResult | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // ── Daily quota gate ────────────────────────────────────────────────
  // Atomically consumes one message credit. Race-proof: the underlying
  // try_consume RPC takes a row lock, so concurrent sends (multiple tabs,
  // or many users at once) cannot exceed the cap. Bails out BEFORE the
  // LLM call — quota denial never costs us a token.
  const quota = await consumeQuota('messages')
  if (!quota.allowed) {
    return {
      error: 'daily_message_limit_reached',
      remaining: quota.remaining ?? 0,
      max: quota.max,
      resetAt: quota.resetAt,
    }
  }

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
    attachment_url: input.attachmentUrl ?? null,
    attachment_mime: input.attachmentMime ?? null,
    attachment_name: input.attachmentFileName ?? null,
  })

  // NOTE: the daily quota was already incremented atomically by consumeQuota
  // above. The lifetime messages_count on profiles is no longer bumped here
  // — usage_windows is the source of truth for daily quotas. If you still
  // need the lifetime counter for dashboards, increment it in a fire-and-
  // forget manner (not on the enforcement path).

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

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const dynamicPrompt = `Current date: ${dateStr}

${systemPrompt ? `## Custom Instructions\n${systemPrompt}\n\n` : ''}${userContext}${ragContext}

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

  // Build the user turn. Attachments route through the shared extraction layer
  // so the agent can read documents/OCR text and act on them (create leads,
  // clients, reminders from an uploaded business card / invoice / contract).
  //   - natural images → vision part (agent sees the image)
  //   - scanned images → OCR text (appended to the message)
  //   - pdf/text files → extracted text (appended to the message)
  let userText = input.content
  let userImage: URL | null = null

  if (input.attachmentUrl && input.attachmentMime) {
    const { extractAttachment, formatExtractedText } = await import(
      '@/lib/document-processing/extract'
    )
    const extracted = await extractAttachment({
      url: input.attachmentUrl,
      mime: input.attachmentMime,
      fileName: input.attachmentFileName ?? 'attachment',
      messageText: input.content,
    })
    if (extracted.kind === 'image-url') {
      userImage = new URL(input.attachmentUrl)
    } else if (extracted.kind === 'text' || extracted.kind === 'ocr') {
      userText += formatExtractedText(
        input.attachmentFileName ?? 'attachment',
        extracted,
      )
    } else if (extracted.kind === 'error') {
      userText += `\n\n[Attachment "${input.attachmentFileName}" could not be read: ${extracted.message}]`
    }
  }

  // Multimodal content array only when the agent should see an image; otherwise
  // a plain string keeps the payload small.
  const userMessage = userImage
    ? ({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image', image: userImage },
        ],
      } as const)
    : ({ role: 'user' as const, content: userText })

  // Generate inside a try — a provider hiccup (rate limit, timeout, network)
  // would otherwise throw raw out of the server fn. The user message was
  // already persisted above, so on failure we surface a clean error instead
  // of a half-broken turn. No retry here (kept simple); the client can resend.
  let result
  try {
    result = await mastraAgent.generate(
      [
        { role: 'system' as const, content: dynamicPrompt },
        userMessage as never, // AI SDK accepts multimodal; Mastra types are stricter
      ],
      {
        memory: {
          resource: user.id,
          thread: input.conversationId,
        },
        maxSteps: 3,
      },
    )
  } catch (err) {
    return { error: safeError(err, 'The assistant is unavailable. Please try again.') }
  }

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
    quota: {
      used: quota.used,
      remaining: quota.remaining,
      max: quota.max,
      resetAt: quota.resetAt,
    },
  }
}

export async function sendMessageForOwnerImpl(input: {
  ownerId: string
  agentId: string
  conversationId: string
  content: string
}): Promise<SendMessageResult | SendMessageLimitResult | { error: string }> {
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

  // Look up the owner's plan so we can enforce the daily message quota on
  // inbound-triggered replies too (a contact texting the agent's WhatsApp
  // consumes the owner's daily credit).
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', input.ownerId)
    .single()
  const ownerPlan = (ownerProfile?.plan ?? 'free') as import('@/lib/plans').PlanTier

  // ── Daily quota gate (service-role path) ────────────────────────────
  const quota = await consumeQuota('messages', {
    userId: input.ownerId,
    plan: ownerPlan,
    supabase,
  })
  if (!quota.allowed) {
    return {
      error: 'daily_message_limit_reached',
      remaining: quota.remaining ?? 0,
      max: quota.max,
      resetAt: quota.resetAt,
    }
  }

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

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const dynamicPrompt = `Current date: ${dateStr}

${systemPrompt ? `## Custom Instructions\n${systemPrompt}\n\n` : ''}${userContext}${ragContext}

## Tools
You have tools to create leads, reminders, tasks, and send messages.

!!! ABSOLUTE RULE: NEVER ask the user for details that exist in this conversation. Immediately call the appropriate tool with whatever you already know. !!!

Rule: Call the tool first, explain later. Never ask "what details?" — use what you already know.`

  const { getAgentByType } = await import('@/mastra')
  const mastraAgent = getAgentByType(agent.type)
  if (!mastraAgent) {
    return { error: `Agent type "${agent.type}" not found` }
  }

  let result
  try {
    result = await mastraAgent.generate(
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
  } catch (err) {
    return { error: safeError(err, 'The assistant is unavailable. Please try again.') }
  }

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
    quota: {
      used: quota.used,
      remaining: quota.remaining,
      max: quota.max,
      resetAt: quota.resetAt,
    },
  }
}
