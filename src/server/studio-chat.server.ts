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
import { sanitizeSupabaseMessage, safeError } from '@/server/_errors'
import { DEFAULT_MODEL_ID } from '@/lib/ai-provider'

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
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }
  return { id: data.id }
}

export async function deleteStudioChatImpl(
  chatId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('studio_chats')
    .delete()
    .eq('id', chatId)
    .eq('owner_id', user.id)
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }
  return null
}

export async function getStudioMessagesImpl(
  chatId: string,
): Promise<StudioMessageRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  // Verify ownership of the parent chat before returning its messages.
  const { data: chat } = await supabase
    .from('studio_chats')
    .select('id')
    .eq('id', chatId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!chat) return []
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
  console.log('[chat-debug] SERVER uploadStudioAttachmentImpl', {
    fileName: input.fileName,
    mimeType: input.mimeType,
    base64Length: input.base64.length,
  })
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.log('[chat-debug] SERVER upload: not authenticated')
    return { error: 'Not authenticated' }
  }

  // Validate content server-side: client-supplied MIME/filename are not trusted.
  const buffer = Buffer.from(input.base64, 'base64')
  console.log('[chat-debug] SERVER upload buffer bytes', buffer.byteLength)
  const { validateUpload, uploadRejectionMessage } = await import(
    '@/lib/media/upload-validate'
  )
  const validated = validateUpload(buffer, input.fileName, input.mimeType)
  if ('reason' in validated) {
    console.log('[chat-debug] SERVER upload REJECTED', validated)
    return { error: uploadRejectionMessage(validated) }
  }
  console.log('[chat-debug] SERVER upload validated OK', {
    ext: validated.ext,
    mime: validated.mime,
  })

  const path = `${user.id}/${crypto.randomUUID()}.${validated.ext}`
  const { error: upErr } = await supabase.storage
    .from('media')
    .upload(path, validated.buffer, {
      contentType: validated.mime,
      cacheControl: '3600',
      upsert: false,
    })
  if (upErr) {
    console.log('[chat-debug] SERVER storage upload error', upErr)
    return { error: 'Upload failed. Please try again.' }
  }

  const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
  console.log('[chat-debug] SERVER upload success', pub.publicUrl)
  return { url: pub.publicUrl }
}

// ---------------------------------------------------------------------------
// Send message — runs the Studio agent with tools
// ---------------------------------------------------------------------------

export async function sendStudioMessageImpl(input: {
  chatId: string
  content: string
  attachmentUrl?: string | null
  /** MIME of the attachment (from validateUpload). Drives extraction routing. */
  attachmentMime?: string | null
  /** Original filename — used for scan/receipt heuristics + framing. */
  attachmentFileName?: string | null
}): Promise<SendStudioMessageResult | StudioLimitResult | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const [{ data: chat }, { data: profile }] = await Promise.all([
    supabase
      .from('studio_chats')
      .select('id, owner_id')
      .eq('id', input.chatId)
      .single(),
    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single(),
  ])
  if (!chat || chat.owner_id !== user.id) {
    return { error: 'Chat not found' }
  }
  if (!profile) return { error: 'Profile not found' }

  // Shared daily quota, consumed only after chat ownership is verified.
  const quota = await consumeQuota('messages', {
    userId: user.id,
    plan: profile.plan as import('@/lib/plans').PlanTier,
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

  // Persist the user message (with attachment if any).
  const { count: messageCount } = await supabase
    .from('studio_messages')
    .select('id', { count: 'exact', head: true })
    .eq('chat_id', input.chatId)
  const isFirst = (messageCount ?? 0) === 0

  await supabase.from('studio_messages').insert({
    chat_id: input.chatId,
    role: 'user',
    content: input.content,
    attachment_url: input.attachmentUrl ?? null,
  })

  // Build the user turn for the model. Attachments are routed through the
  // shared extraction layer:
  //   - natural images → vision part (model sees the image)
  //   - scanned images → OCR text (appended to the message)
  //   - pdf/text files → extracted text (appended to the message)
  // This lets the agent reason over document contents and act on them.
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
      // Surface the extraction failure to the model so it can tell the user
      // rather than silently ignoring the attachment.
      userText += `\n\n[Attachment "${input.attachmentFileName}" could not be read: ${extracted.message}]`
    }
  }

  // Assemble the multimodal content array — include the image part only when
  // the extraction layer routed to vision.
  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image'; image: URL }
  > = [{ type: 'text', text: userText }]
  if (userImage) {
    userContent.push({ type: 'image', image: userImage })
  }

  const agent = await getStudioAgent()
  if (!agent) return { error: 'Studio agent unavailable' }

  let result
  try {
    result = await agent.generate(
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
  } catch (err) {
    return { error: safeError(err, 'The assistant is unavailable. Please try again.') }
  }

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
    model: DEFAULT_MODEL_ID,
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
