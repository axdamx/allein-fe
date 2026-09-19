import { format } from 'date-fns'
import {
  ArrowUpRight,
  CreditCard,
  Loader2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'

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
  formatPrice,
  type PlanTier,
} from '@/lib/plans'
import {
  useBillingSummary,
  useOpenBillingPortal,
  useStartSubscriptionCheckout,
} from '@/hooks/use-billing'
import { cn } from '@/lib/utils'

export const PlanTab = ({ currentPlan }: { currentPlan: PlanTier }) => {
  const billing = useBillingSummary()
  const checkout = useStartSubscriptionCheckout()
  const portal = useOpenBillingPortal()
  const summary = billing.data && !('error' in billing.data) ? billing.data : null
  const hasStripeSubscription = summary?.provider === 'stripe'
  const hasActiveStripeSubscription =
    hasStripeSubscription &&
    ['active', 'trialing', 'past_due'].includes(summary.status)
  const hasPaymentIssue =
    summary?.status === 'past_due' || summary?.status === 'unpaid'
  const isInactiveStripeSubscription =
    hasStripeSubscription && !hasActiveStripeSubscription

  const openPortal = () => portal.mutate()
  const contactBilling = () =>
    window.location.assign(
      'mailto:billing@allein.ai?subject=Allein%20plan%20change',
    )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan &amp; Billing</CardTitle>
        <CardDescription>
          You're currently on the{' '}
          <PlanBadge tier={currentPlan} /> plan. Paid access is activated from
          verified Stripe subscription events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary?.provider === 'stripe' ? (
          <div
            className={cn(
              'flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between',
              hasPaymentIssue
                ? 'border-amber-500/30 bg-amber-500/8'
                : isInactiveStripeSubscription
                  ? 'border-slate-500/20 bg-slate-500/8'
                  : 'border-emerald-500/25 bg-emerald-500/8',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-background/80 p-2">
                {hasPaymentIssue || isInactiveStripeSubscription ? (
                  <TriangleAlert className="size-4 text-amber-600" />
                ) : (
                  <ShieldCheck className="size-4 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {hasPaymentIssue
                    ? 'Payment needs attention'
                    : isInactiveStripeSubscription
                      ? 'Subscription inactive'
                    : summary.cancelAtPeriodEnd
                      ? 'Cancellation scheduled'
                      : 'Subscription active'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isInactiveStripeSubscription
                    ? 'Paid access is inactive. You can review invoices or update payment details in Stripe.'
                    : summary.currentPeriodEnd
                      ? `${summary.cancelAtPeriodEnd ? 'Access ends' : 'Current billing period ends'} ${format(new Date(summary.currentPeriodEnd), 'd MMMM yyyy')}.`
                      : 'Stripe securely manages your billing details.'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={portal.isPending}
              onClick={openPortal}
            >
              {portal.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CreditCard />
              )}
              Manage billing
            </Button>
          </div>
        ) : summary?.provider === 'manual' ? (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4 text-sm">
            <p className="font-medium">Complimentary or manually managed plan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This plan is not attached to Stripe. Contact billing support for
              changes, or choose a Stripe plan below when you are ready.
            </p>
          </div>
        ) : null}

        {PLAN_ORDER.map((tier) => {
          const cfg = PLAN_CONFIGS[tier]
          const isCurrent = tier === currentPlan
          const isUpgrade = isHigherTier(currentPlan, tier)
          const isCheckoutPlan = tier === 'lite' || tier === 'pro'
          const isStartingThisPlan =
            checkout.isPending && checkout.variables === tier
          return (
            <div
              key={tier}
              className={cn(
                'flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white/35 p-4 transition-colors dark:border-white/10 dark:bg-white/[0.025]',
                isCurrent && 'border-[#F1663C]/30 bg-[#F1663C]/8 dark:border-[#F1663C]/30 dark:bg-[#F1663C]/10',
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
                  asChild={tier === 'custom' && !isCurrent}
                  disabled={
                    tier === 'custom' && !isCurrent
                      ? false
                      : isCurrent ||
                        billing.isLoading ||
                        checkout.isPending ||
                        portal.isPending
                  }
                  onClick={
                    isCurrent
                      ? undefined
                      : tier === 'custom'
                        ? undefined
                        : summary?.provider === 'manual'
                          ? contactBilling
                          : hasActiveStripeSubscription
                            ? openPortal
                            : isCheckoutPlan
                              ? () => checkout.mutate(tier)
                              : undefined
                  }
                  className="mt-1"
                >
                  {tier === 'custom' && !isCurrent ? (
                    <a href="mailto:billing@allein.ai?subject=Allein%20Custom%20plan">
                      Contact sales <ArrowUpRight />
                    </a>
                  ) : isStartingThisPlan ||
                    (portal.isPending && hasActiveStripeSubscription) ? (
                    <>
                      <Loader2 className="animate-spin" /> Opening
                    </>
                  ) : isCurrent ? (
                    'Current'
                  ) : summary?.provider === 'manual' ? (
                    'Contact billing'
                  ) : hasActiveStripeSubscription ? (
                    'Manage plan'
                  ) : isUpgrade ? (
                    'Upgrade securely'
                  ) : (
                    'Choose plan'
                  )}
                </Button>
              </div>
            </div>
          )
        })}

        <div className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Checkout, saved payment methods, invoices, and cancellations are
            handled in Stripe's secure hosted pages. Allein never receives your
            full card details.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
