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
import { getDefaultModel } from '@/lib/ai-provider'
import { retrieveContext } from '@/server/documents.server'

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
    const platformGuides: Record<PostPlatform, string> = {
      instagram: 'Instagram: visual-first, use emojis, 5-10 hashtags, max 2200 chars',
      facebook: 'Facebook: conversational, 2-5 hashtags, max 2000 chars',
      linkedin: 'LinkedIn: professional tone, 3-5 hashtags, max 3000 chars, no excessive emojis',
      x: 'X (Twitter): punchy, max 280 chars, 1-3 hashtags',
      tiktok: 'TikTok: trendy, casual, 3-5 hashtags, max 150 chars caption',
      whatsapp: 'WhatsApp: short, direct, no hashtags',
      email: 'Email: subject line + body, professional, no hashtags',
    }

    // Retrieve RAG context for brand voice / product info
    const relevantChunks = await retrieveContext(input.prompt, input.agentId, 3)
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

    // Extract JSON from the response (handles markdown fences + reasoning)
    const raw = result.text
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { error: 'AI did not return valid content. Please try again.' }
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate required fields
    if (!parsed.title || !parsed.caption) {
      return { error: 'Generated content was incomplete. Please try again.' }
    }

    return {
      title: String(parsed.title).slice(0, 100),
      caption: String(parsed.caption),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h: string) => String(h).replace(/^#/, '')).slice(0, 15)
        : [],
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Content generation failed',
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
}

export async function createPostImpl(
  input: CreatePostInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      owner_id: user.id,
      title: input.title,
      caption: input.caption,
      hashtags: input.hashtags,
      platform: input.platform,
      status: input.scheduledFor ? 'scheduled' : 'ready',
      scheduled_for: input.scheduledFor ?? null,
      prompt: input.prompt ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

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
  scheduledFor?: string | null
  status?: PostStatus
}): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()

  const updates: Record<string, string | string[] | null> = {}
  if (input.title !== undefined) updates.title = input.title
  if (input.caption !== undefined) updates.caption = input.caption
  if (input.hashtags !== undefined) updates.hashtags = input.hashtags
  if (input.scheduledFor !== undefined)
    updates.scheduled_for = input.scheduledFor
  if (input.status !== undefined) updates.status = input.status

  const { error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', input.id)

  if (error) return { error: error.message }
  return null
}

export async function deletePostImpl(
  postId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) return { error: error.message }

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
