import { format } from 'date-fns'
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock3,
  CreditCard,
  Loader2,
  RotateCcw,
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
  const hasScheduledCancellation =
    hasActiveStripeSubscription &&
    summary?.cancelAtPeriodEnd === true &&
    !hasPaymentIssue

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
        {summary?.provider === 'stripe' && hasScheduledCancellation ? (
          <ScheduledCancellationCard
            tier={summary.plan}
            currentPeriodEnd={summary.currentPeriodEnd}
            isOpeningPortal={portal.isPending}
            onManage={openPortal}
          />
        ) : summary?.provider === 'stripe' ? (
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
                      : 'Subscription active'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isInactiveStripeSubscription
                    ? 'Paid access is inactive. You can review invoices or update payment details in Stripe.'
                    : summary.currentPeriodEnd
                      ? `Current billing period ends ${format(new Date(summary.currentPeriodEnd), 'd MMMM yyyy')}.`
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

function ScheduledCancellationCard({
  tier,
  currentPeriodEnd,
  isOpeningPortal,
  onManage,
}: {
  tier: PlanTier
  currentPeriodEnd: string | null
  isOpeningPortal: boolean
  onManage: () => void
}) {
  const plan = PLAN_CONFIGS[tier]
  const endDate = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), 'd MMMM yyyy')
    : 'the end of your billing period'

  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.11] via-orange-500/[0.055] to-background shadow-[0_14px_40px_rgba(120,75,15,0.08)] dark:from-amber-400/[0.12] dark:via-orange-400/[0.05]">
      <div className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-amber-300/15 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-background/75 text-amber-700 shadow-sm backdrop-blur dark:text-amber-300">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold tracking-[-0.015em]">
                  Your {plan.label} plan is ending
                </p>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                  Cancellation scheduled
                </span>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                You&apos;ve canceled renewal, but nothing changes today. Your
                full <span className="font-medium text-foreground">{plan.label}</span>{' '}
                access continues until{' '}
                <span className="font-medium text-foreground">{endDate}</span>.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/25 bg-background/70 hover:bg-background"
            disabled={isOpeningPortal}
            onClick={onManage}
          >
            {isOpeningPortal ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RotateCcw />
            )}
            Review or resume
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <CancellationFact
            icon={Check}
            label="Access now"
            value={`${plan.label} stays active`}
          />
          <CancellationFact
            icon={Clock3}
            label="Access ends"
            value={endDate}
          />
          <CancellationFact
            icon={CreditCard}
            label="Next step"
            value="Moves to Free automatically"
          />
        </div>

        <div className="mt-4 flex items-start gap-2 border-t border-amber-500/15 pt-4 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-300" />
          <p>
            Your plan will not renew after this period. Changed your mind? You
            can resume it in Stripe any time before {endDate}.
          </p>
        </div>
      </div>
    </section>
  )
}

function CancellationFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Check
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-amber-500/15 bg-background/55 p-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-3.5 text-amber-700 dark:text-amber-300" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  )
}
