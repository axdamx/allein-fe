/**
 * Server-only implementation for the Studio chat (conversational media studio).
 *
 * Mirrors the CRM chat pattern (`chat.server.ts`) but against the
 * `studio_chats` / `studio_messages` tables and using the built-in Studio
 * Mastra agent. Supports image attachments on user messages.
 *
 * Quota: reuses the daily `messages` window so studio chat shares the same
 * per-day budget as the regular agent chat.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { getStudioAgent } from '@/mastra'
import { consumeQuota } from '@/server/profile.server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudioChatRow {
  id: string
  owner_id: string
  title: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface StudioToolCall {
  name: string
  success: boolean
  message: string
  assetId?: string
  url?: string
}

export interface StudioMessageRow {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  attachment_url: string | null
  asset_id: string | null
  tool_calls: StudioToolCall[]
  model: string | null
  tokens_in: number | null
  tokens_out: number | null
  created_at: string
}

export interface SendStudioMessageResult {
  reply: string
  toolCalls: StudioToolCall[]
  quota?: {
    used: number
    remaining: number | null
    max: number | null
    resetAt: string
  }
}

export interface StudioLimitResult {
  error: 'daily_message_limit_reached'
  remaining: number
  max: number | null
  resetAt: string
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listStudioChatsImpl(): Promise<StudioChatRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('studio_chats')
    .select('*')
    .eq('owner_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data as unknown as StudioChatRow[]
}

export async function createStudioChatImpl(input: {
  title?: string
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('studio_chats')
    .insert({
      owner_id: user.id,
      title: input.title ?? 'New studio chat',
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: data.id }
}

export async function deleteStudioChatImpl(
  chatId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('studio_chats')
    .delete()
    .eq('id', chatId)
  if (error) return { error: error.message }
  return null
}

export async function getStudioMessagesImpl(
  chatId: string,
): Promise<StudioMessageRow[]> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('studio_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data as unknown as StudioMessageRow[]
}

// ---------------------------------------------------------------------------
// Attachment upload — mirrors the knowledge-base base64 pattern
// ---------------------------------------------------------------------------

export async function uploadStudioAttachmentImpl(input: {
  fileName: string
  mimeType: string
  base64: string
}): Promise<{ url: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ext = input.fileName.includes('.')
    ? input.fileName.split('.').pop()!
    : 'png'
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const buffer = Buffer.from(input.base64, 'base64')
  const { error: upErr } = await supabase.storage
    .from('media')
    .upload(path, buffer, {
      contentType: input.mimeType,
      cacheControl: '3600',
      upsert: false,
    })
  if (upErr) return { error: upErr.message }

  const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
  return { url: pub.publicUrl }
}

// ---------------------------------------------------------------------------
// Send message — runs the Studio agent with tools
// ---------------------------------------------------------------------------

export async function sendStudioMessageImpl(input: {
  chatId: string
  content: string
  attachmentUrl?: string | null
}): Promise<SendStudioMessageResult | StudioLimitResult | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // ── Daily message quota (shared with CRM chat) ──────────────────────
  const quota = await consumeQuota('messages')
  if (!quota.allowed) {
    return {
      error: 'daily_message_limit_reached',
      remaining: quota.remaining ?? 0,
      max: quota.max,
      resetAt: quota.resetAt,
    }
  }

  const { data: chat } = await supabase
    .from('studio_chats')
    .select('id, owner_id')
    .eq('id', input.chatId)
    .single()
  if (!chat || chat.owner_id !== user.id) {
    return { error: 'Chat not found' }
  }

  // Persist the user message (with attachment if any).
  const { data: msgCount } = await supabase
    .from('studio_messages')
    .select('id', { count: 'exact', head: true })
    .eq('chat_id', input.chatId)
  const isFirst = (msgCount?.length ?? 0) === 0

  await supabase.from('studio_messages').insert({
    chat_id: input.chatId,
    role: 'user',
    content: input.content,
    attachment_url: input.attachmentUrl ?? null,
  })

  // Build the user turn for the model — include the image inline if attached.
  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: URL }
  > = [{ type: 'text', text: input.content }]
  if (input.attachmentUrl) {
    userContent.push({ type: 'image', image: new URL(input.attachmentUrl) })
  }

  const agent = getStudioAgent()
  if (!agent) return { error: 'Studio agent unavailable' }

  const result = await agent.generate(
    [
      {
        role: 'user',
        content: userContent,
      } as never, // AI SDK accepts multimodal content; Mastra types are stricter
    ],
    {
      memory: {
        resource: user.id, // resourceId → tools read this as owner id
        thread: input.chatId,
      },
      maxSteps: 4,
    },
  )

  const replyText = result.text

  // Extract tool-call summaries (esp. asset ids / urls) for the UI canvas.
  const toolCalls: StudioToolCall[] = []
  const steps = result.steps ?? []
  for (const step of steps) {
    const toolResults = (step as { toolResults?: unknown[] }).toolResults ?? []
    for (const tr of toolResults as Array<Record<string, unknown>>) {
      const output = (tr.output ?? tr.result ?? {}) as Record<string, unknown>
      toolCalls.push({
        name: String(tr.toolName ?? tr.name ?? 'unknown'),
        success: output?.success !== false,
        message: String(output?.message ?? output?.error ?? 'Completed'),
        assetId: output?.assetId ? String(output.assetId) : undefined,
        url: output?.url ? String(output.url) : undefined,
      })
    }
  }

  // Best-effort: link the assistant message to the most recent asset produced.
  const lastAssetId = [...toolCalls].reverse().find((t) => t.assetId)?.assetId
  const lastAssetUrl = [...toolCalls].reverse().find((t) => t.url)?.url

  await supabase.from('studio_messages').insert({
    chat_id: input.chatId,
    role: 'assistant',
    content: replyText,
    model: 'glm-4.5-flash',
    asset_id: lastAssetId ?? null,
    attachment_url: lastAssetUrl ?? null,
    tool_calls: toolCalls,
    tokens_in: result.usage?.inputTokens ?? null,
    tokens_out: result.usage?.outputTokens ?? null,
  })

  if (isFirst) {
    const title =
      input.content.length > 60 ? input.content.slice(0, 57) + '...' : input.content
    await supabase.from('studio_chats').update({ title }).eq('id', input.chatId)
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
