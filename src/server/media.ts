/**
 * Public server functions for AI media generation.
 *
 * Client-callable via RPC. Implementations live in media.server.ts.
 *
 * Plan gating: image generation requires `aiImageGen`. Video submissions
 * currently return a coming soon response before any provider call. The
 * Custom tier's `aiVideoGen` entitlement remains configured for launch.
 */
import { createServerFn } from '@tanstack/react-start'

export type { StudioAssetRow, MediaKind } from './media.server'
export type {
  GenerateImageInput,
  SubmitVideoInput,
} from './media.server'

import type { MediaKind } from './media.server'
import { rateLimit } from './_rate-limit'

/**
 * Check a plan feature flag and throw a typed error if the user's tier doesn't
 * include it. Mirrors the `enforceLimitImpl` pattern but for boolean features.
 * Returns the resolved user profile so callers can reuse the id.
 */
async function enforceFeature(feature: 'aiImageGen' | 'aiVideoGen') {
  const { getCurrentUserProfile } = await import('./profile.server')
  const { PLAN_CONFIGS } = await import('@/lib/plans')
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  const allowed = PLAN_CONFIGS[profile.plan as keyof typeof PLAN_CONFIGS]?.features?.[feature]
  if (!allowed) {
    const err = new Error(`Feature ${feature} is not available on your plan`)
    err.name = 'PlanFeatureError'
    throw err
  }
  return profile
}

/**
 * Per-user rate limit on expensive AI generation. Stops a single user from
 * hammering the paid image/video APIs. The daily quota gates chat messages;
 * this is a tighter burst limit on generation itself.
 *
 * Throws a typed RateLimitError on exceed so the client can show a friendly
 * "slow down" message instead of a generic 500.
 */
function enforceGenerationRate(
  userId: string,
  kind: 'image' | 'video',
) {
  const cfg = kind === 'image'
    ? { windowMs: 60_000, max: 6 }   // 6 images / minute
    : { windowMs: 60_000, max: 2 }   // 2 video submissions / minute
  const rl = rateLimit(`gen:${kind}:${userId}`, cfg)
  if (!rl.allowed) {
    const err = new Error('Rate limit exceeded — please slow down and try again shortly.')
    err.name = 'RateLimitError'
    throw err
  }
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export const generateImage = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      prompt: string
      aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
    }) => d,
  )
  .handler(async ({ data }) => {
    const profile = await enforceFeature('aiImageGen')
    enforceGenerationRate(profile.id, 'image')
    const { generateImageImpl } = await import('./media.server')
    return generateImageImpl(data)
  })

// ---------------------------------------------------------------------------
// Video (async)
// ---------------------------------------------------------------------------

export const submitVideo = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      prompt: string
      imageUrl?: string
      aspectRatio?: string
      durationSeconds?: number
      quality?: 'speed' | 'quality'
    }) => d,
  )
  .handler(async () => {
    // Keep the Custom tier entitlement configured, but do not start paid video
    // jobs until the generator is released with its monthly quota controls.
    return { error: 'Video generation is coming soon.' }
  })

export const pollVideo = createServerFn({ method: 'GET' })
  .validator((d: { assetId: string }) => d)
  .handler(async ({ data }) => {
    // No feature gate — polling is free; gating happened at submit time.
    const { pollVideoImpl } = await import('./media.server')
    return pollVideoImpl(data)
  })

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export const listAssets = createServerFn({ method: 'GET' })
  .validator((d: { kind?: MediaKind } = {}) => d)
  .handler(async ({ data }) => {
    const { listAssetsImpl } = await import('./media.server')
    return listAssetsImpl(data?.kind)
  })

export const getAsset = createServerFn({ method: 'GET' })
  .validator((d: { assetId: string }) => d)
  .handler(async ({ data }) => {
    const { getAssetImpl } = await import('./media.server')
    return getAssetImpl(data.assetId)
  })

export const deleteAsset = createServerFn({ method: 'POST' })
  .validator((d: { assetId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteAssetImpl } = await import('./media.server')
    return deleteAssetImpl(data.assetId)
  })
