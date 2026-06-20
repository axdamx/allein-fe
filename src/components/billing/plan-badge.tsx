import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PLAN_CONFIGS, type PlanTier } from '@/lib/plans'

/**
 * Small badge showing the user's current plan tier.
 * Uses the tier's accent color.
 */
export function PlanBadge({
  tier,
  className,
}: {
  tier: PlanTier
  className?: string
}) {
  const config = PLAN_CONFIGS[tier]
  return (
    <Badge
      variant="secondary"
      className={cn('capitalize', className)}
      style={{
        color: config.accent,
        backgroundColor: `${config.accent}15`,
      }}
    >
      {config.label}
    </Badge>
  )
}
