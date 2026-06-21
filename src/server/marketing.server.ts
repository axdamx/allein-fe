/**
 * Server-only implementation for the Marketing Studio.
 *
 * Handles: AI content generation, post CRUD, scheduling, calendar retrieval.
 * Uses Vercel AI SDK for structured content generation.
 */
import { generateObject } from 'ai'
import { z } from 'zod'
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

/** Schema for structured post generation output. */
const postSchema = z.object({
  title: z.string().describe('A catchy title (max 60 chars)'),
  caption: z.string().describe('The main post caption/body text'),
  hashtags: z
    .array(z.string())
    .describe('Relevant hashtags WITHOUT the # symbol'),
})

export interface GeneratedPost {
  title: string
  caption: string
  hashtags: string[]
}

/**
 * Generate social media content using AI.
 *
 * Uses generateObject for guaranteed-structured output (no JSON parsing).
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
    // Platform-specific constraints
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

    const systemPrompt = `You are an expert social media content creator.
Generate engaging content for the requested platform.

Platform guide: ${platformGuides[input.platform]}
Tone: ${input.tone ?? 'professional yet engaging'}${ragContext}

Generate a title, caption, and relevant hashtags based on the user's request.`

    const { object } = await generateObject({
      model: getDefaultModel(),
      system: systemPrompt,
      prompt: input.prompt,
      schema: postSchema,
      maxOutputTokens: 1000,
      temperature: 0.8,
    })

    return {
      title: object.title,
      caption: object.caption,
      hashtags: object.hashtags.map((h) => h.replace(/^#/, '')),
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
