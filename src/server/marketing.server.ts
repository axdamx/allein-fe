/**
 * Server-only implementation for the Marketing Studio.
 *
 * Handles: AI content generation, post CRUD, scheduling, calendar retrieval.
 *
 * Note: We use generateText + manual JSON parsing instead of generateObject
 * because GLM-4.5-flash doesn't support responseFormat (json_schema). The
 * schema-based approach fails silently — generateText with explicit JSON
 * instructions is more reliable with this model.
 */
import { generateText } from 'ai'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { safeError, sanitizeSupabaseMessage } from '@/server/_errors'
import { consumeQuota } from '@/server/profile.server'
import { getDefaultModel } from '@/lib/ai-provider'
import { retrieveContext } from '@/server/document-retrieval.server'
import { extractJson } from '@/lib/json-extract'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PostPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'tiktok'
  | 'whatsapp'
  | 'telegram'
  | 'email'

export type PostStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'scheduled'
  | 'published'
  | 'failed'

export interface PostRow {
  id: string
  owner_id: string
  campaign_id: string | null
  agent_id: string | null
  title: string | null
  caption: string | null
  body: string | null
  hashtags: string[]
  platform: PostPlatform
  status: PostStatus
  media_url: string | null
  media_type: string | null
  scheduled_for: string | null
  published_at: string | null
  prompt: string | null
  created_at: string
  updated_at: string
}

export interface CampaignRow {
  id: string
  owner_id: string
  name: string
  description: string | null
  status: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// AI Content Generation
// ---------------------------------------------------------------------------

export interface GeneratedPost {
  title: string
  caption: string
  hashtags: string[]
}

/**
 * Generate social media content using AI.
 *
 * Uses generateText with explicit JSON output instructions, then parses
 * the JSON from the response. This is more reliable than generateObject
 * with GLM-4.5-flash (which doesn't support json_schema responseFormat).
 *
 * Optionally retrieves RAG context from the user's knowledge base for
 * brand-consistent content.
 */
export async function generatePostImpl(input: {
  prompt: string
  platform: PostPlatform
  tone?: string
  agentId?: string
}): Promise<GeneratedPost | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const platformGuides: Record<PostPlatform, string> = {
      instagram: 'Instagram: visual-first, use emojis, 5-10 hashtags, max 2200 chars',
      facebook: 'Facebook: conversational, 2-5 hashtags, max 2000 chars',
      linkedin: 'LinkedIn: professional tone, 3-5 hashtags, max 3000 chars, no excessive emojis',
      x: 'X (Twitter): punchy, max 280 chars, 1-3 hashtags',
      tiktok: 'TikTok: trendy, casual, 3-5 hashtags, max 150 chars caption',
      whatsapp: 'WhatsApp: short, direct, no hashtags',
      telegram: 'Telegram: conversational, medium length, can use hashtags sparingly',
      email: 'Email: subject line + body, professional, no hashtags',
    }

    // Retrieve RAG context for brand voice / product info
    const relevantChunks = await retrieveContext({
      query: input.prompt,
      ownerId: user.id,
      supabase,
      agentId: input.agentId,
      matchCount: 3,
    })
    const ragContext =
      relevantChunks.length > 0
        ? `\n\nBrand/product context from knowledge base:\n${relevantChunks
            .map((c) => c.content)
            .join('\n---\n')}`
        : ''

    const systemPrompt = `You are an expert social media content creator. Generate engaging content for ${input.platform}.

Platform guide: ${platformGuides[input.platform]}
Tone: ${input.tone ?? 'professional yet engaging'}${ragContext}

CRITICAL: You must respond with ONLY a valid JSON object in this exact format (no markdown, no explanation, no other text):
{"title":"A catchy title max 60 chars","caption":"The main post body text","hashtags":["tag1","tag2","tag3"]}

Rules:
- "title" must be a short catchy string (max 60 chars)
- "caption" must be the full post body text (follow the platform guide for length)
- "hashtags" must be an array of strings WITHOUT the # symbol
- Output ONLY the JSON object, nothing else`

    const result = await generateText({
      model: getDefaultModel(),
      system: systemPrompt,
      prompt: input.prompt,
      maxOutputTokens: 1500,
      temperature: 0.8,
    })

    // GLM frequently emits trailing commas or prose around the JSON — use the
    // hardened extractor instead of a raw JSON.parse on a greedy regex.
    const parsed = extractJson<{
      title?: string
      caption?: string
      hashtags?: unknown[]
    }>(result.text)

    if (!parsed) {
      return { error: 'AI did not return valid content. Please try again.' }
    }

    // Validate required fields
    if (!parsed.title || !parsed.caption) {
      return { error: 'Generated content was incomplete. Please try again.' }
    }

    return {
      title: String(parsed.title).slice(0, 100),
      caption: String(parsed.caption),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags
            .map((h) => String(h).replace(/^#/, ''))
            .slice(0, 15)
        : [],
    }
  } catch (err) {
    return {
      error: safeError(err, 'Content generation failed'),
    }
  }
}

// ---------------------------------------------------------------------------
// Post CRUD
// ---------------------------------------------------------------------------

export async function getPostsImpl(): Promise<PostRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as PostRow[]
}

export interface CreatePostInput {
  title: string
  caption: string
  hashtags: string[]
  platform: PostPlatform
  scheduledFor?: string
  prompt?: string
  mediaAssetId?: string
  status?: 'draft' | 'ready'
}

export async function createPostImpl(
  input: CreatePostInput,
): Promise<
  | { id: string }
  | { error: string }
  | { error: 'daily_post_limit_reached'; remaining: number; max: number | null; resetAt: string }
> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  let mediaUrl: string | null = null
  if (input.mediaAssetId) {
    const { data: asset, error: assetError } = await supabase
      .from('studio_assets')
      .select('url, storage_path')
      .eq('id', input.mediaAssetId)
      .eq('owner_id', user.id)
      .eq('kind', 'image')
      .eq('status', 'ready')
      .maybeSingle()
    if (assetError || !asset?.url || !asset.storage_path) {
      return { error: 'This image is not saved permanently. Generate a new image before attaching it.' }
    }
    mediaUrl = asset.url
  }

  if (input.scheduledFor && (!Number.isFinite(Date.parse(input.scheduledFor)) || Date.parse(input.scheduledFor) <= Date.now())) {
    return { error: 'Choose a future date for your content plan.' }
  }

  // ── Daily quota gate ────────────────────────────────────────────────
  // Atomically consumes one post credit via the race-proof try_consume RPC.
  // Bails out BEFORE the insert so a denied quota never persists a row.
  // Note: AI generation (generatePostImpl) is intentionally NOT metered —
  // users can iterate on content drafts freely; only saving a post counts.
  const quota = await consumeQuota('posts')
  if (!quota.allowed) {
    return {
      error: 'daily_post_limit_reached',
      remaining: quota.remaining ?? 0,
      max: quota.max,
      resetAt: quota.resetAt,
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      owner_id: user.id,
      title: input.title,
      caption: input.caption,
      hashtags: input.hashtags,
      platform: input.platform,
      status: input.status === 'draft' ? 'draft' : 'ready',
      scheduled_for: input.scheduledFor ?? null,
      prompt: input.prompt ?? null,
      media_url: mediaUrl,
      media_type: mediaUrl ? 'image' : null,
    })
    .select('id')
    .single()

  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }

  // Increment usage counter
  await supabase.rpc('increment_usage', {
    p_user_id: user.id,
    p_metric: 'posts_count',
    p_amount: 1,
  })

  return { id: data.id }
}

export async function updatePostImpl(input: {
  id: string
  title?: string
  caption?: string
  hashtags?: string[]
  platform?: PostPlatform
  mediaAssetId?: string | null
  scheduledFor?: string | null
  status?: PostStatus
}): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, string | string[] | null> = {}
  if (input.title !== undefined) updates.title = input.title.trim()
  if (input.caption !== undefined) updates.caption = input.caption.trim()
  if (input.hashtags !== undefined) updates.hashtags = input.hashtags
  if (input.platform !== undefined) updates.platform = input.platform
  if (input.mediaAssetId !== undefined) {
    if (input.mediaAssetId === null) {
      updates.media_url = null
      updates.media_type = null
    } else {
      const { data: asset, error: assetError } = await supabase
        .from('studio_assets')
        .select('url, storage_path')
        .eq('id', input.mediaAssetId)
        .eq('owner_id', user.id)
        .eq('kind', 'image')
        .eq('status', 'ready')
        .maybeSingle()
      if (assetError || !asset?.url || !asset.storage_path) {
        return { error: 'Choose an image saved permanently in your Studio library.' }
      }
      updates.media_url = asset.url
      updates.media_type = 'image'
    }
  }
  if (input.scheduledFor !== undefined)
    updates.scheduled_for = input.scheduledFor
  if (input.scheduledFor && (!Number.isFinite(Date.parse(input.scheduledFor)) || Date.parse(input.scheduledFor) <= Date.now())) {
    return { error: 'Choose a future date for your content plan.' }
  }
  // Publishing states belong to a future provider-backed delivery workflow.
  if (input.status !== undefined) {
    if (input.status !== 'draft' && input.status !== 'ready') {
      return { error: 'Publishing is not available yet.' }
    }
    updates.status = input.status
  } else if (input.scheduledFor !== undefined) {
    // Old rows stored an unsupported "scheduled" state; editing their plan
    // converts them back to a ready draft without asserting delivery.
    updates.status = 'ready'
  }

  if (Object.keys(updates).length === 0) return null

  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', input.id)
    .eq('owner_id', user.id)
    .in('status', ['draft', 'ready', 'scheduled'])
    .select('id')

  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }
  if (!data?.length) return { error: 'Post not found or cannot be edited.' }
  return null
}

/** Make a new editable draft; a duplicate consumes the same daily post quota. */
export async function duplicatePostImpl(postId: string) {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: source, error } = await supabase
    .from('posts')
    .select('title, caption, hashtags, platform, prompt, media_url')
    .eq('id', postId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (error || !source) return { error: 'Post not found.' }

  let mediaAssetId: string | undefined
  if (source.media_url) {
    const { data: asset } = await supabase
      .from('studio_assets')
      .select('id, storage_path')
      .eq('owner_id', user.id)
      .eq('kind', 'image')
      .eq('status', 'ready')
      .eq('url', source.media_url)
      .maybeSingle()
    if (!asset?.storage_path) {
      return { error: 'The original image is no longer saved permanently. Replace it before duplicating.' }
    }
    mediaAssetId = asset.id
  }

  return createPostImpl({
    title: `${source.title || 'Untitled'} (copy)`,
    caption: source.caption ?? '',
    hashtags: source.hashtags ?? [],
    platform: source.platform as PostPlatform,
    prompt: source.prompt ?? undefined,
    mediaAssetId,
    status: 'draft',
  })
}

export async function deletePostImpl(
  postId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }

  // Decrement usage
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    await supabase.rpc('decrement_usage', {
      p_user_id: user.id,
      p_metric: 'posts_count',
      p_amount: 1,
    })
  }

  return null
}
