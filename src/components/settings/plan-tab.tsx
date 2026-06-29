import { useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PlanBadge } from '@/components/billing/plan-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  PLAN_CONFIGS,
  PLAN_ORDER,
  isHigherTier,
  type PlanTier,
} from '@/lib/plans'
import { cn } from '@/lib/utils'
import { updatePlan } from '@/server/settings'

export const PlanTab = ({ currentPlan }: { currentPlan: PlanTier }) => {
  const qc = useQueryClient()

  const changePlan = useMutation({
    mutationFn: (plan: PlanTier) => updatePlan({ data: { plan } }),
    onSuccess: (result, plan) => {
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Switched to ${PLAN_CONFIGS[plan].label} plan`)
        qc.invalidateQueries({ queryKey: ['profile'] })
        qc.invalidateQueries({ queryKey: ['plan-state'] })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan &amp; Billing</CardTitle>
        <CardDescription>
          You're currently on the{' '}
          <PlanBadge tier={currentPlan} /> plan. Real billing integration ships
          in Phase 7 — for now you can switch plans to test gating.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLAN_ORDER.map((tier) => {
          const cfg = PLAN_CONFIGS[tier]
          const isCurrent = tier === currentPlan
          const isUpgrade = isHigherTier(currentPlan, tier)
          return (
            <div
              key={tier}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                isCurrent && 'border-primary bg-primary/5',
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{cfg.label}</p>
                  {isCurrent && <PlanBadge tier={tier} />}
                </div>
                <p className="text-xs text-muted-foreground">{cfg.tagline}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {cfg.price === null
                    ? 'Custom'
                    : cfg.price === 0
                      ? 'Free'
                      : `$${cfg.price}/mo`}
                </p>
                <Button
                  size="sm"
                  variant={isCurrent ? 'outline' : isUpgrade ? 'default' : 'outline'}
                  disabled={isCurrent || changePlan.isPending}
                  onClick={() => changePlan.mutate(tier)}
                  className="mt-1"
                >
                  {isCurrent ? 'Current' : isUpgrade ? 'Upgrade' : 'Switch'}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
