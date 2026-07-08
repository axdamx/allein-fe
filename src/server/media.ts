/**
 * Public server functions for AI media generation.
 *
 * Client-callable via RPC. Implementations live in media.server.ts.
 *
 * Plan gating: image generation requires `aiImageGen`, video requires
 * `aiVideoGen`. Both are enforced here (the public boundary) before the
 * implementation runs.
 */
import { createServerFn } from '@tanstack/react-start'

export type { StudioAssetRow, MediaKind } from './media.server'
export type {
  GenerateImageInput,
  SubmitVideoInput,
} from './media.server'

import type { MediaKind } from './media.server'

/**
 * Check a plan feature flag and throw a typed error if the user's tier doesn't
 * include it. Mirrors the `enforceLimitImpl` pattern but for boolean features.
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
    await enforceFeature('aiImageGen')
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
  .handler(async ({ data }) => {
    await enforceFeature('aiVideoGen')
    const { submitVideoImpl } = await import('./media.server')
    return submitVideoImpl(data)
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
