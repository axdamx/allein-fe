/**
 * Server-only implementation for AI media generation (image + video).
 *
 * Generated images must be mirrored to the `media` Supabase Storage bucket
 * before they become ready. Assets are tracked in `studio_assets` for the
 * library and Studio chat. Video generation remains disabled at the public
 * boundary until its quota and publishing workflow are ready.
 *
 * Plan gating is enforced in the public wrapper (`src/server/media.ts`) before
 * these implementations run, so we don't re-check the feature flag here.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { generateCogViewImage, getImageGenerationUserMessage, ZaiMediaError } from '@/lib/media/cogview'
import {
  submitCogVideoXJob,
  pollCogVideoXJob,
} from '@/lib/media/cogvideox'
import { requireUserId } from '@/server/_auth'
import { safeError, sanitizeSupabaseMessage } from '@/server/_errors'
import { consumeQuota } from '@/server/profile.server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { assertSafeUrl } from '@/lib/url-guard'
import { validateUpload, uploadRejectionMessage, MAX_UPLOAD_BYTES } from '@/lib/media/upload-validate'
import { rateLimit } from '@/server/_rate-limit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MediaKind = 'image' | 'video'

export interface StudioAssetRow {
  id: string
  owner_id: string
  kind: MediaKind
  prompt: string
  provider: string
  provider_model: string | null
  provider_id: string | null
  status: 'pending' | 'processing' | 'ready' | 'failed'
  storage_path: string | null
  url: string | null
  aspect_ratio: string | null
  duration_ms: number | null
  error: string | null
  meta: {
    size?: string
    remote_url?: string
    cover_image_url?: string
    [key: string]: string | number | boolean | null | undefined
  }
  reference_id: string | null
  collection_id: string | null
  created_at: string
  updated_at: string
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

/**
 * Mirror a remote asset (ZAI URL) into our public `media` bucket so it stays
 * available even after ZAI's ephemeral URLs expire. Returns the public URL
 * and storage path.
 */
export async function mirrorToStorage(
  userId: string,
  remoteUrl: string,
  ext: 'png' | 'jpg' | 'webp' | 'mp4' | 'webm',
  supabase: SupabaseClient = getSupabaseServerClient(),
): Promise<{ storagePath: string; publicUrl: string }> {
  const bufRes = await fetch(assertSafeUrl(remoteUrl))
  if (!bufRes.ok) {
    throw new Error(`Failed to download asset (${bufRes.status})`)
  }
  const buffer = Buffer.from(await bufRes.arrayBuffer())
  const remoteType = bufRes.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
  const imageExt = remoteType === 'image/jpeg' ? 'jpg'
    : remoteType === 'image/webp' ? 'webp'
      : remoteType === 'image/png' ? 'png' : null
  const storedExt = ext === 'mp4' || ext === 'webm' ? ext : imageExt ?? ext
  const storagePath = `${userId}/${crypto.randomUUID()}.${storedExt}`

  const { error: upErr } = await supabase.storage
    .from('media')
    .upload(storagePath, buffer, {
      contentType:
        storedExt === 'mp4' ? 'video/mp4'
          : storedExt === 'webm' ? 'video/webm'
            : storedExt === 'jpg' ? 'image/jpeg' : `image/${storedExt}`,
      cacheControl: '3600',
      upsert: false,
    })
  if (upErr) throw new Error('Storage upload failed')

  const { data: pub } = supabase.storage.from('media').getPublicUrl(storagePath)
  return { storagePath, publicUrl: pub.publicUrl }
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export async function uploadStudioImageImpl(input: {
  fileName: string
  mimeType: string
  base64: string
}): Promise<StudioAssetRow | { error: string }> {
  try {
    const userId = await getCurrentUserId()
    if (!rateLimit(`studio-image-upload:${userId}`, { windowMs: 60_000, max: 10 }).allowed) {
      return { error: 'Too many uploads. Please wait a minute and try again.' }
    }
    if (input.base64.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 16) {
      return { error: 'Image is too large. Maximum size is 10 MB.' }
    }
    const validated = validateUpload(Buffer.from(input.base64, 'base64'), input.fileName, input.mimeType)
    if ('reason' in validated) return { error: uploadRejectionMessage(validated) }
    if (!validated.mime.startsWith('image/')) return { error: 'Choose a PNG, JPEG, WebP, or GIF image.' }

    const supabase = getSupabaseServerClient()
    const storagePath = `${userId}/${crypto.randomUUID()}.${validated.ext}`
    const { error: uploadError } = await supabase.storage.from('media').upload(storagePath, validated.buffer, {
      contentType: validated.mime,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) return { error: sanitizeSupabaseMessage(uploadError.message, 'Could not upload image.') }

    const { data: publicData } = supabase.storage.from('media').getPublicUrl(storagePath)
    const { data: row, error: rowError } = await supabase.from('studio_assets').insert({
      owner_id: userId,
      kind: 'image',
      prompt: input.fileName.slice(0, 120),
      provider: 'upload',
      status: 'ready',
      storage_path: storagePath,
      url: publicData.publicUrl,
      meta: { original_name: input.fileName.slice(0, 120) },
    }).select('*').single()
    if (rowError) {
      await supabase.storage.from('media').remove([storagePath])
      return { error: sanitizeSupabaseMessage(rowError.message, 'Could not save image to the library.') }
    }
    return row as unknown as StudioAssetRow
  } catch (err) {
    return { error: safeError(err, 'Image upload failed.') }
  }
}

export interface GenerateImageInput {
  prompt: string
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
}

export async function generateImageImpl(
  input: GenerateImageInput,
): Promise<StudioAssetRow | { error: string }> {
  try {
    const userId = await getCurrentUserId()
    const supabase = getSupabaseServerClient()

    // Charge for attempts before calling the paid provider. Both form and
    // agent generation use this same monthly counter.
    const quota = await consumeQuota('imageGen')
    if (!quota.allowed) {
      return { error: `Monthly image limit reached (${quota.max}). Resets ${new Date(quota.resetAt).toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}.` }
    }

    // Create a pending row first so we always have a handle even on failure.
    const { data: row, error: rowErr } = await supabase
      .from('studio_assets')
      .insert({
        owner_id: userId,
        kind: 'image',
        prompt: input.prompt,
        provider: 'zai',
        provider_model: 'cogview-4-250304',
        status: 'processing',
        aspect_ratio: input.aspectRatio ?? '1:1',
      })
      .select('*')
      .single()
    if (rowErr) return { error: sanitizeSupabaseMessage(rowErr.message, 'Failed to start image generation') }

    let result
    try {
      result = await generateCogViewImage({
        prompt: input.prompt,
        aspectRatio: input.aspectRatio ?? '1:1',
      })
    } catch (err) {
      const msg = err instanceof ZaiMediaError ? err.message : 'Image generation failed'
      // Persist the detailed reason on the asset row (internal, not returned).
      await supabase
        .from('studio_assets')
        .update({ status: 'failed', error: msg })
        .eq('id', row.id)
      return { error: getImageGenerationUserMessage(err) }
    }

    // Mirror to our bucket so the URL is durable.
    let mirrored: { storagePath: string; publicUrl: string }
    try {
      mirrored = await mirrorToStorage(userId, result.remoteUrl, 'png', supabase)
    } catch (err) {
      console.warn('[media.server] image mirror failed:', err)
      await supabase.from('studio_assets').update({ status: 'failed', error: 'Could not save image to permanent storage' }).eq('id', row.id)
      return { error: 'Image was generated but could not be saved. Please try again.' }
    }

    const { data: updated, error: updErr } = await supabase
      .from('studio_assets')
      .update({
        status: 'ready',
        url: mirrored.publicUrl,
        storage_path: mirrored.storagePath,
        meta: { size: result.size, remote_url: result.remoteUrl },
      })
      .eq('id', row.id)
      .select('*')
      .single()
    if (updErr) return { error: sanitizeSupabaseMessage(updErr.message, 'Failed to complete image generation') }

    return updated as unknown as StudioAssetRow
  } catch (err) {
    return {
      error: safeError(err, 'Image generation failed'),
    }
  }
}

// ---------------------------------------------------------------------------
// Video generation (async)
// ---------------------------------------------------------------------------

export interface SubmitVideoInput {
  prompt: string
  imageUrl?: string
  /** Aspect ratio token like '16:9' (mapped to a valid ZAI size). */
  aspectRatio?: string
  durationSeconds?: number
  quality?: 'speed' | 'quality'
}

export async function submitVideoImpl(
  input: SubmitVideoInput,
): Promise<StudioAssetRow | { error: string }> {
  try {
    const userId = await getCurrentUserId()
    const supabase = getSupabaseServerClient()

    const { data: row, error: rowErr } = await supabase
      .from('studio_assets')
      .insert({
        owner_id: userId,
        kind: 'video',
        prompt: input.prompt,
        provider: 'zai',
        provider_model: 'cogvideox-3',
        status: 'processing',
        aspect_ratio: input.aspectRatio ?? null,
        duration_ms: input.durationSeconds ? input.durationSeconds * 1000 : null,
      })
      .select('*')
      .single()
    if (rowErr) return { error: sanitizeSupabaseMessage(rowErr.message, 'Failed to start video generation') }

    let submission
    try {
      submission = await submitCogVideoXJob({
        prompt: input.prompt,
        imageUrl: input.imageUrl,
        aspectRatio: input.aspectRatio,
        durationSeconds: input.durationSeconds,
        quality: input.quality,
      })
    } catch (err) {
      const msg = err instanceof ZaiMediaError ? err.message : 'Video submit failed'
      await supabase
        .from('studio_assets')
        .update({ status: 'failed', error: msg })
        .eq('id', row.id)
      return { error: 'Video submission failed. Check the asset for details.' }
    }

    const { data: updated, error: updErr } = await supabase
      .from('studio_assets')
      .update({
        provider_id: submission.taskId,
        provider_model: submission.model,
      })
      .eq('id', row.id)
      .select('*')
      .single()
    if (updErr) return { error: sanitizeSupabaseMessage(updErr.message, 'Failed to complete video submission') }

    return updated as unknown as StudioAssetRow
  } catch (err) {
    return {
      error: safeError(err, 'Video submission failed'),
    }
  }
}

export interface PollVideoInput {
  assetId: string
}

/**
 * Poll ZAI for one video asset. If complete, mirrors the result to Storage and
 * marks the row ready. Returns the latest asset state.
 */
export async function pollVideoImpl(
  input: PollVideoInput,
): Promise<StudioAssetRow | { error: string }> {
  try {
    const userId = await getCurrentUserId()
    const supabase = getSupabaseServerClient()

    const { data: row, error } = await supabase
      .from('studio_assets')
      .select('*')
      .eq('id', input.assetId)
      .eq('owner_id', userId) // RLS doubles up
      .single()
    if (error || !row) return { error: error?.message ?? 'Asset not found' }

    // Already resolved — return as-is.
    if (row.status === 'ready' || row.status === 'failed') {
      return row as unknown as StudioAssetRow
    }

    if (!row.provider_id) {
      return { error: 'Asset has no provider task id' }
    }

    const result = await pollCogVideoXJob(row.provider_id)

    if (result.status === 'processing') {
      return row as unknown as StudioAssetRow
    }

    if (result.status === 'failed') {
      const { data: failed } = await supabase
        .from('studio_assets')
        .update({ status: 'failed', error: result.error ?? 'Generation failed' })
        .eq('id', input.assetId)
        .select('*')
        .single()
      return (failed ?? row) as unknown as StudioAssetRow
    }

    // Success — mirror video + cover to our bucket.
    let videoUrl = result.videoUrl
    let coverUrl = result.coverImageUrl
    let storagePath: string | null = null
    try {
      if (videoUrl) {
        const mirrored = await mirrorToStorage(userId, videoUrl, 'mp4')
        videoUrl = mirrored.publicUrl
        storagePath = mirrored.storagePath
      }
      if (coverUrl) {
        try {
          const cover = await mirrorToStorage(userId, coverUrl, 'jpg')
          coverUrl = cover.publicUrl
        } catch {
          // cover is optional
        }
      }
    } catch (err) {
      console.warn('[media.server] video mirror failed:', err)
    }

    const { data: ready } = await supabase
      .from('studio_assets')
      .update({
        status: 'ready',
        url: videoUrl ?? null,
        storage_path: storagePath,
        meta: { cover_image_url: coverUrl },
      })
      .eq('id', input.assetId)
      .select('*')
      .single()

    return (ready ?? row) as unknown as StudioAssetRow
  } catch (err) {
    return { error: safeError(err, 'Failed to check video status') }
  }
}

// ---------------------------------------------------------------------------
// Library queries
// ---------------------------------------------------------------------------

export async function listAssetsImpl(
  kind?: MediaKind,
): Promise<StudioAssetRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('studio_assets')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  if (kind) query = query.eq('kind', kind)

  const { data, error } = await query
  if (error || !data) return []
  return data as unknown as StudioAssetRow[]
}

export async function getAssetImpl(
  assetId: string,
): Promise<StudioAssetRow | null> {
  const supabase = getSupabaseServerClient()
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('studio_assets')
    .select('*')
    .eq('id', assetId)
    .eq('owner_id', userId)
    .single()
  if (error || !data) return null
  return data as unknown as StudioAssetRow
}

export async function deleteAssetImpl(
  assetId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const userId = await requireUserId()
  // Scope the lookup by owner_id so foreign assets are invisible.
  const { data: row } = await supabase
    .from('studio_assets')
    .select('storage_path, url')
    .eq('id', assetId)
    .eq('owner_id', userId)
    .maybeSingle()

  if (!row) return { error: 'Asset not found' }

  const { count: logoCount, error: logoError } = await supabase
    .from('studio_brand_kits')
    .select('owner_id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .eq('logo_asset_id', assetId)
  if (logoError) return { error: 'Could not check whether this image is your brand logo.' }
  if (logoCount && logoCount > 0) return { error: 'This image is your brand logo. Remove it from the brand kit before deleting.' }

  if (row.url) {
    const { count, error: referencesError } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('media_url', row.url)
    if (referencesError) return { error: 'Could not check whether this image is used by a post.' }
    if (count && count > 0) return { error: 'This image is attached to a post. Remove it from the post before deleting.' }
  }

  const { count: carouselCount, error: carouselError } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .contains('media_asset_ids', [assetId])
  if (carouselError) return { error: 'Could not check whether this image is used in a post.' }
  if (carouselCount && carouselCount > 0) return { error: 'This image is in a post. Remove it before deleting.' }

  const { error } = await supabase
    .from('studio_assets')
    .delete()
    .eq('id', assetId)
    .eq('owner_id', userId)
  if (error) return { error: 'Failed to delete asset' }
  if (row.storage_path) {
    await supabase.storage.from('media').remove([row.storage_path])
  }
  return null
}
