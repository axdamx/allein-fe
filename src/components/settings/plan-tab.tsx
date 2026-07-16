import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PlanBadge } from '@/components/billing/plan-badge'
import { CancelSubscriptionDialog } from '@/components/billing/cancel-subscription-dialog'
import { SubscriptionStatusBanner } from '@/components/billing/subscription-status-banner'
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
  formatPrice,
  type PlanTier,
} from '@/lib/plans'
import { cn } from '@/lib/utils'
import { updatePlan } from '@/server/settings'
import { useSubscriptionState } from '@/hooks/use-subscriptions'

export const PlanTab = ({ currentPlan }: { currentPlan: PlanTier }) => {
  const qc = useQueryClient()
  const [cancelOpen, setCancelOpen] = useState(false)
  const subState = useSubscriptionState()
  const subscription = subState.data?.subscription
  const showCancel =
    currentPlan !== 'free' && !subState.data?.isCanceledPending
  const showBanner = !!subscription && subState.data?.isCanceledPending === true

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
          <PlanBadge tier={currentPlan} /> plan. Billing integration is coming
          soon — for now you can switch plans to test gating.
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
                  {formatPrice(cfg, true)}
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

        {showBanner && subscription && (
          <SubscriptionStatusBanner subscription={subscription} />
        )}

        {showCancel && (
          <div className="flex justify-end pt-2">
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              Cancel subscription
            </Button>
          </div>
        )}

        <CancelSubscriptionDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          currentPlan={currentPlan}
          currentPeriodEnd={subscription?.current_period_end ?? null}
        />
      </CardContent>
    </Card>
  )
}
