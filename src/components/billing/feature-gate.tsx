import { useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import { PLAN_CONFIGS } from '@/lib/plans'
import type { FeatureKey, LimitMetric } from '@/lib/plans'

/**
 * Wraps children and only renders them if the user's plan includes `feature`.
 * Otherwise shows a locked placeholder with an upgrade CTA.
 *
 * @example
 * <FeatureGate feature="marketingStudio">
 *   <MarketingStudio />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: FeatureKey
  children: ReactNode
  /** Optional custom fallback instead of the default locked card. */
  fallback?: ReactNode
}) {
  const { hasFeature, tier } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  if (fallback) return <>{fallback}</>

  return (
    <>
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Lock className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Available on higher plans</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {PLAN_CONFIGS[tier].label} plan doesn't include this feature.
          </p>
        </div>
        <Button onClick={() => setUpgradeOpen(true)}>
          <Lock className="size-4" /> Upgrade to unlock
        </Button>
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        reason={{ kind: 'feature', feature }}
      />
    </>
  )
}

/**
 * Renders children only if the user hasn't hit `metric`'s limit.
 * Otherwise shows the fallback (default: an upgrade CTA).
 *
 * @example
 * <UsageGate metric="agents" currentCount={3}>
 *   <NewAgentButton />
 * </UsageGate>
 */
export function UsageGate({
  metric,
  currentCount,
  children,
  fallback,
}: {
  metric: LimitMetric
  /** Pass the current count if you have it; otherwise the hook's usage is used. */
  currentCount?: number
  children: ReactNode
  fallback?: ReactNode
}) {
  const { canDo, usage, config, tier } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const used = currentCount ?? usage[metric]
  const max = config.limits[metric].max
  const allowed = canDo(metric)

  if (allowed) {
    return <>{children}</>
  }

  if (fallback) return <>{fallback}</>

  return (
    <>
      <div
        className="inline-flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-sm text-muted-foreground"
        role="alert"
      >
        <Lock className="size-3.5" />
        <span>
          {max === null ? '' : `${used}/${max} `}
          {metric} used — limit reached
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          onClick={() => setUpgradeOpen(true)}
        >
          Upgrade
        </Button>
      </div>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        reason={{ kind: 'limit', metric, used, max }}
      />
    </>
  )
}
