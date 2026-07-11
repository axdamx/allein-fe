import { useState } from 'react'

import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import type { LimitMetric } from '@/lib/plans'

/**
 * Inline usage meter shown at the top of a module page.
 *
 * Renders `X of Y used · N remaining` with a progress bar and, when the
 * limit is reached, an "Upgrade for more" link. Hidden on unlimited tiers.
 *
 * @example
 * <UsageIndicator metric="documents" label="documents" />
 * <UsageIndicator metric="posts" label="posts" windowSuffix="/day" />
 */
export const UsageIndicator = ({
  metric,
  label,
  windowSuffix,
  className,
}: {
  metric: LimitMetric
  /** Display label for the resource, e.g. "documents" or "posts". */
  label: string
  /** Optional suffix shown after the max, e.g. "/day" for windowed metrics. */
  windowSuffix?: string
  className?: string
}) => {
  const { usage, remaining, config, tier, canDo } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const max = config.limits[metric].max
  if (max === null) return null // unlimited tier — nothing to show

  const used = usage[metric]
  const rem = remaining[metric]
  const atLimit = !canDo(metric)

  return (
    <>
      <div
        className={
          'mb-4 flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-2.5 text-sm ' +
          (className ?? '')
        }
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {used} of {max} {label} used
            {windowSuffix && (
              <span className="text-muted-foreground">{windowSuffix}</span>
            )}
            {rem !== null && rem > 0 && (
              <span className="ml-1">
                · {rem} {rem === 1 ? 'slot' : 'slots'} remaining
              </span>
            )}
          </span>
        </div>
        {atLimit && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade for more
          </Button>
        )}
        <Progress
          value={Math.min(100, Math.round((used / max) * 100))}
          className="h-1.5 max-w-[180px] flex-1"
        />
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
