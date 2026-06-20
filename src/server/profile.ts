/**
 * Public server functions for plan / profile access.
 *
 * This file is imported by client code (e.g. use-plan.ts) — it must NOT
 * contain any server-only imports at module scope. Each createServerFn
 * below lazily imports its implementation from profile.server.ts inside
 * the handler, so the server-only code is never bundled into the client.
 */
import { createServerFn } from '@tanstack/react-start'
import type { PlanTier, LimitMetric } from '@/lib/plans'

export interface PlanState {
  tier: PlanTier
  usage: Record<LimitMetric, number>
  remaining: Record<LimitMetric, number | null>
  features: (typeof import('@/lib/plans').PLAN_CONFIGS)[PlanTier]['features']
}

/** Error thrown when a server action exceeds the user's plan. */
export class PlanLimitError extends Error {
  readonly metric: LimitMetric
  readonly currentTier: PlanTier
  readonly requiredTier: PlanTier | null
  readonly used: number
  readonly max: number | null

  constructor(
    metric: LimitMetric,
    currentTier: PlanTier,
    used: number,
    max: number | null,
  ) {
    const maxLabel = max === null ? 'unlimited' : String(max)
    super(
      `Plan limit reached: ${metric} (${used}/${maxLabel}) on the ${currentTier} plan.`,
    )
    this.name = 'PlanLimitError'
    this.metric = metric
    this.currentTier = currentTier
    this.requiredTier = null
    this.used = used
    this.max = max
  }
}

/** Error thrown when a feature isn't available on the user's tier. */
export class FeatureNotAvailableError extends Error {
  readonly feature: string
  readonly currentTier: PlanTier
  readonly requiredTier: PlanTier | null

  constructor(feature: string, currentTier: PlanTier) {
    super(`Feature "${feature}" is not available on the ${currentTier} plan.`)
    this.name = 'FeatureNotAvailableError'
    this.feature = feature
    this.currentTier = currentTier
    this.requiredTier = null
  }
}

/**
 * Returns the current user's plan state for gating UI.
 * Safe to call from client code — executes on the server via RPC.
 */
export const getPlanState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getPlanStateImpl } = await import('./profile.server')
    return getPlanStateImpl()
  },
)

/**
 * Security helper: throws PlanLimitError if the user is at/over a limit.
 * Call inside server actions before performing metered operations.
 */
export const enforceLimit = createServerFn({ method: 'POST' })
  .validator((d: { metric: LimitMetric }) => d)
  .handler(async ({ data }) => {
    const { enforceLimitImpl } = await import('./profile.server')
    return enforceLimitImpl(data.metric)
  })

/**
 * Security helper: throws FeatureNotAvailableError if the tier lacks a feature.
 * Call inside server actions before enabling a gated feature.
 */
export const requireFeature = createServerFn({ method: 'POST' })
  .validator((d: { feature: string }) => d)
  .handler(async ({ data }) => {
    const { requireFeatureImpl } = await import('./profile.server')
    return requireFeatureImpl(data.feature)
  })
