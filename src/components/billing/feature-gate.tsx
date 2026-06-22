import { useState, type ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import { PLAN_CONFIGS, PLAN_ORDER } from '@/lib/plans'
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
  const { hasFeature } = usePlan()

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  if (fallback) return <>{fallback}</>

  const minTier = PLAN_ORDER.find((t) => PLAN_CONFIGS[t].features[feature])
  const minTierLabel = minTier ? PLAN_CONFIGS[minTier].label : 'a higher'
  const featureLabel = FEATURE_LABELS[feature] ?? feature

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <h2 className="mt-3 font-semibold">{featureLabel} is a paid feature</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upgrade to {minTierLabel} or higher to unlock this feature.
          </p>
          <Button asChild className="mt-4">
            <Link to="/pricing">View pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  crm: 'CRM',
  marketingStudio: 'Marketing Studio',
  ragDocuments: 'Knowledge Base',
  aiImageGen: 'AI Image Generation',
  aiVideoGen: 'AI Video Generation',
  scheduledPosts: 'Scheduled Posts',
  teamSeats: 'Team Seats',
  apiAccess: 'API Access',
  whiteLabel: 'White Label',
  prioritySupport: 'Priority Support',
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
