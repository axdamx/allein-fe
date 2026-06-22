import { useQuery } from '@tanstack/react-query'
import { getPlanState } from '@/server/profile'
import { PLAN_CONFIGS } from '@/lib/plans'
import type { PlanTier, LimitMetric, FeatureKey } from '@/lib/plans'

/**
 * Hook that exposes the current user's plan + usage + feature flags.
 *
 * Powered by TanStack Query — fetches once, caches for 5 minutes, and
 * refetches on window focus so usage counters stay reasonably fresh.
 *
 * Returns `null` for plan/usage when not authenticated.
 */
export function usePlan() {
  const query = useQuery({
    queryKey: ['plan-state'],
    queryFn: () => getPlanState(),
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: true,
  })

  const state = query.data ?? null
  const tier: PlanTier = state?.tier ?? 'free'
  const config = PLAN_CONFIGS[tier]

  return {
    /** Raw query state for loading/error handling. */
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,

    tier,
    config,

    usage: state?.usage ?? {
      agents: 0,
      conversations: 0,
      messages: 0,
      posts: 0,
      documents: 0,
      leads: 0,
    },
    remaining: state?.remaining ?? {
      agents: PLAN_CONFIGS.free.limits.agents.max,
      conversations: PLAN_CONFIGS.free.limits.conversations.max,
      messages: PLAN_CONFIGS.free.limits.messages.max,
      posts: PLAN_CONFIGS.free.limits.posts.max,
      documents: PLAN_CONFIGS.free.limits.documents.max,
      leads: PLAN_CONFIGS.free.limits.leads.max,
    },

    /** True if the user can still perform one more of this metric. */
    canDo: (metric: LimitMetric): boolean => {
      const rem = state?.remaining[metric]
      return rem === undefined || rem === null || rem > 0
    },

    /** True if the feature is enabled on the current tier. */
    hasFeature: (feature: FeatureKey): boolean => {
      return config.features[feature]
    },

    /** Percentage of a metric used (0–100). Returns 0 for unlimited. */
    percentUsed: (metric: LimitMetric): number => {
      const max = config.limits[metric].max
      if (max === null || max === 0) return 0
      const used = state?.usage[metric] ?? 0
      return Math.min(100, Math.round((used / max) * 100))
    },
  }
}
