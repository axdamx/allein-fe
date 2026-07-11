/**
 * Server-only implementation for Studio storyboards.
 *
 * CRUD for storyboards + scenes, plus a "generate from brief" helper that asks
 * the LLM to decompose a brief into N ordered scene prompts (no media yet —
 * the user generates per-scene media via the existing image/video flows).
 *
 * Reorder uses the `reorder_studio_scenes` Postgres RPC so positions stay
 * gapless and unique-constraint collisions are avoided.
 */
import { generateText } from 'ai'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { getDefaultModel } from '@/lib/ai-provider'
import { extractJson } from '@/lib/json-extract'
import { assertOwnership } from '@/server/_auth'
import { safeError, sanitizeSupabaseMessage } from '@/server/_errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoryboardRow {
  id: string
  owner_id: string
  title: string
  brief: string | null
  duration_ms: number | null
  aspect_ratio: string
  created_at: string
  updated_at: string
}

export interface SceneRow {
  id: string
  storyboard_id: string
  position: number
  asset_id: string | null
  image_url: string | null
  caption: string
  prompt: string | null
  duration_ms: number
  created_at: string
  updated_at: string
}

export interface StoryboardWithScenes extends StoryboardRow {
  scenes: SceneRow[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ---------------------------------------------------------------------------
// Storyboard CRUD
// ---------------------------------------------------------------------------

export async function listStoryboardsImpl(): Promise<StoryboardRow[]> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('studio_storyboards')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data as unknown as StoryboardRow[]
}

export async function getStoryboardImpl(
  storyboardId: string,
): Promise<StoryboardWithScenes | null> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()

  const { data: sb, error: sbErr } = await supabase
    .from('studio_storyboards')
    .select('*')
    .eq('id', storyboardId)
    .eq('owner_id', userId)
    .single()
  if (sbErr || !sb) return null

  const { data: scenes } = await supabase
    .from('studio_scenes')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('position', { ascending: true })

  return {
    ...(sb as unknown as StoryboardRow),
    scenes: (scenes ?? []) as unknown as SceneRow[],
  }
}

export async function createStoryboardImpl(input: {
  title?: string
  brief?: string
  aspectRatio?: string
}): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('studio_storyboards')
    .insert({
      owner_id: userId,
      title: input.title ?? 'Untitled storyboard',
      brief: input.brief ?? null,
      aspect_ratio: input.aspectRatio ?? '16:9',
    })
    .select('id')
    .single()
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }
  return { id: data.id }
}

export async function updateStoryboardImpl(input: {
  id: string
  title?: string
  brief?: string
  aspectRatio?: string
}): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()
  const updates: Record<string, unknown> = {}
  if (input.title !== undefined) updates.title = input.title
  if (input.brief !== undefined) updates.brief = input.brief
  if (input.aspectRatio !== undefined) updates.aspect_ratio = input.aspectRatio

  const { error } = await supabase
    .from('studio_storyboards')
    .update(updates)
    .eq('id', input.id)
    .eq('owner_id', userId)
  return error ? { error: sanitizeSupabaseMessage(error.message, 'Operation failed') } : null
}

export async function deleteStoryboardImpl(
  storyboardId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()
  const { error } = await supabase
    .from('studio_storyboards')
    .delete()
    .eq('id', storyboardId)
    .eq('owner_id', userId)
  return error ? { error: sanitizeSupabaseMessage(error.message, 'Operation failed') } : null
}

// ---------------------------------------------------------------------------
// Scene CRUD
// ---------------------------------------------------------------------------

export interface UpsertSceneInput {
  id?: string
  storyboardId: string
  caption?: string
  prompt?: string
  imageUrl?: string | null
  assetId?: string | null
  durationMs?: number
}

export async function upsertSceneImpl(
  input: UpsertSceneInput,
): Promise<SceneRow | { error: string }> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()

  // Verify the parent storyboard belongs to the caller. This guards both the
  // insert path (attaching scenes to another user's storyboard) and the
  // update path (mutating a scene whose storyboard is foreign).
  if (!(await assertOwnership('studio_storyboards', input.storyboardId, userId))) {
    return { error: 'Storyboard not found' }
  }
  // On update, additionally confirm the existing scene's storyboard matches
  // the one supplied (prevents moving a scene to a foreign storyboard).
  if (input.id) {
    const { data: existing } = await supabase
      .from('studio_scenes')
      .select('storyboard_id')
      .eq('id', input.id)
      .eq('storyboard_id', input.storyboardId)
      .maybeSingle()
    if (!existing) return { error: 'Scene not found' }
  }

  // For new scenes, append at the end (max position + 1).
  let position = 0
  if (!input.id) {
    const { data: maxRow } = await supabase
      .from('studio_scenes')
      .select('position')
      .eq('storyboard_id', input.storyboardId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    position = ((maxRow as { position?: number } | null)?.position ?? -1) + 1
  }

  const payload = {
    storyboard_id: input.storyboardId,
    caption: input.caption ?? '',
    prompt: input.prompt ?? null,
    image_url: input.imageUrl ?? null,
    asset_id: input.assetId ?? null,
    duration_ms: input.durationMs ?? 2000,
    ...(input.id ? { id: input.id } : { position }),
  }

  const { data, error } = input.id
    ? await supabase
        .from('studio_scenes')
        .update({
          caption: payload.caption,
          prompt: payload.prompt,
          image_url: payload.image_url,
          asset_id: payload.asset_id,
          duration_ms: payload.duration_ms,
        })
        .eq('id', input.id)
        .select('*')
        .single()
    : await supabase
        .from('studio_scenes')
        .insert(payload as Record<string, unknown>)
        .select('*')
        .single()

  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Operation failed') }
  return data as unknown as SceneRow
}

export async function deleteSceneImpl(
  sceneId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()
  // Scope the delete by ownership via a sub-check: confirm the scene's
  // storyboard belongs to the caller before deleting.
  const { data: scene } = await supabase
    .from('studio_scenes')
    .select('storyboard_id')
    .eq('id', sceneId)
    .maybeSingle()
  if (!scene) return { error: 'Scene not found' }
  if (!(await assertOwnership('studio_storyboards', scene.storyboard_id, userId))) {
    return { error: 'Scene not found' }
  }
  const { error } = await supabase.from('studio_scenes').delete().eq('id', sceneId)
  return error ? { error: sanitizeSupabaseMessage(error.message, 'Operation failed') } : null
}

/** Reorder all scenes in a storyboard by passing an ordered list of ids. */
export async function reorderScenesImpl(input: {
  storyboardId: string
  sceneIds: string[]
}): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const userId = await getCurrentUserId()
  // Defense in depth: the RPC also checks ownership (migration 0023), but we
  // verify here too so the request never reaches Postgres if unauthorized.
  if (!(await assertOwnership('studio_storyboards', input.storyboardId, userId))) {
    return { error: 'Storyboard not found' }
  }
  const { error } = await supabase.rpc('reorder_studio_scenes', {
    p_storyboard_id: input.storyboardId,
    p_scene_ids: input.sceneIds,
  })
  return error ? { error: sanitizeSupabaseMessage(error.message, 'Operation failed') } : null
}

// ---------------------------------------------------------------------------
// Generate-from-brief — LLM decomposes a brief into N scene prompts
// ---------------------------------------------------------------------------

export interface GeneratedScenePlan {
  title: string
  scenes: Array<{
    caption: string
    prompt: string
    duration_ms: number
  }>
}

export async function generateStoryboardFromBriefImpl(input: {
  brief: string
  sceneCount?: number
  aspectRatio?: string
}): Promise<GeneratedScenePlan | { error: string }> {
  const count = Math.min(Math.max(input.sceneCount ?? 4, 2), 8)
  const ar = input.aspectRatio ?? '16:9'

  try {
    const systemPrompt = `You are a video director planning a ${count}-scene storyboard.
Respond with ONLY a JSON object in this exact shape (no markdown, no commentary):
{
  "title": "short storyboard title",
  "scenes": [
    { "caption": "1-line narration / on-screen text", "prompt": "a rich visual generation prompt for this scene", "duration_ms": 2000 }
  ]
}
Rules:
- Exactly ${count} scenes, ordered.
- Each "prompt" should be vivid (subject + style + lighting + composition).
- Aspect ratio is ${ar}; mention framing where relevant.
- "duration_ms" between 1500 and 5000.
- Output ONLY the JSON.`

    const result = await generateText({
      model: getDefaultModel(),
      system: systemPrompt,
      prompt: input.brief,
      maxOutputTokens: 1200,
      temperature: 0.7,
    })

    // GLM frequently emits trailing commas or prose around the JSON — use the
    // hardened extractor instead of a raw JSON.parse on a greedy regex.
    const parsed = extractJson<{
      title?: string
      scenes?: Array<{ caption?: string; prompt?: string; duration_ms?: number }>
    }>(result.text)

    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      return {
        error:
          'AI did not return a valid storyboard plan. Please try again or rephrase the brief.',
      }
    }

    return {
      title: String(parsed.title ?? 'Untitled storyboard').slice(0, 100),
      scenes: parsed.scenes
        .slice(0, count)
        .map((s) => ({
          caption: String(s.caption ?? ''),
          prompt: String(s.prompt ?? ''),
          duration_ms: Number(s.duration_ms ?? 2000) || 2000,
        })),
    }
  } catch (err) {
    return {
      error: safeError(err, 'Storyboard plan failed'),
    }
  }
}
