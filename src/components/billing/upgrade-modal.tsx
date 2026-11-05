import { ArrowRight, ArrowUpRight, Check, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useStartSubscriptionCheckout } from '@/hooks/use-billing'
import {
  PLAN_CONFIGS,
  PLAN_ORDER,
  isHigherTier,
  formatPrice,
  type PlanTier,
  type LimitMetric,
  type FeatureKey,
} from '@/lib/plans'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The tier the user is currently on. */
  currentTier: PlanTier
  /** Optional context: which metric/feature triggered the upgrade prompt. */
  reason?:
    | { kind: 'limit'; metric: LimitMetric; used: number; max: number | null }
    | { kind: 'feature'; feature: FeatureKey }
    | { kind: 'general' }
}

const METRIC_LABELS: Record<LimitMetric, string> = {
  agents: 'AI agents',
  conversations: 'conversations',
  messages: 'AI messages',
  posts: 'marketing posts',
  imageGen: 'AI images per month',
  documents: 'knowledge documents',
  leads: 'CRM leads',
  whatsappMessages: 'WhatsApp messages',
  telegramMessages: 'Telegram messages',
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  crm: 'CRM pipeline',
  clients: 'Client database',
  marketingStudio: 'Marketing Studio',
  aiImageGen: 'AI image generation',
  aiVideoGen: 'AI video generation',
  ragDocuments: 'RAG knowledge base',
  scheduledPosts: 'Post planning',
  teamSeats: 'Team seats',
  apiAccess: 'API access',
  whiteLabel: 'White-label',
  prioritySupport: 'Priority support',
  whatsappBroadcast: 'WhatsApp broadcast',
  telegramBot: 'Telegram bot',
}

const CORE_METRICS: LimitMetric[] = ['agents', 'messages', 'posts', 'documents']

function formatLimit(value: number | null, window?: 'day' | 'month' | 'lifetime') {
  if (value === null) return 'Unlimited'
  const period = window === 'day' ? ' / day' : window === 'month' ? ' / month' : ''
  return `${value.toLocaleString()}${period}`
}

export const UpgradeModal = ({
  open,
  onOpenChange,
  currentTier,
  reason = { kind: 'general' },
}: UpgradeModalProps) => {
  const checkout = useStartSubscriptionCheckout()
  // Only show tiers higher than the current one.
  const upgradeOptions = PLAN_ORDER.filter((t) => isHigherTier(currentTier, t))
  const selfServeOptions = upgradeOptions.filter(
    (tier): tier is 'lite' | 'pro' => tier === 'lite' || tier === 'pro',
  )
  const showCustom = upgradeOptions.includes('custom')
  const custom = PLAN_CONFIGS.custom
  const visibleMetrics =
    reason.kind === 'limit'
      ? [reason.metric, ...CORE_METRICS.filter((metric) => metric !== reason.metric)].slice(0, 4)
      : CORE_METRICS

  const reasonText =
    reason.kind === 'limit'
      ? `You've used ${reason.used}${
          reason.max === null ? '' : ` of ${reason.max}`
        } ${METRIC_LABELS[reason.metric]} on the ${PLAN_CONFIGS[currentTier].label} plan.`
      : reason.kind === 'feature'
        ? `${FEATURE_LABELS[reason.feature]} isn't available on the ${PLAN_CONFIGS[currentTier].label} plan.`
        : `Unlock more power by upgrading your plan.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,880px)] flex-col gap-0 overflow-hidden rounded-[24px] p-0 sm:w-[calc(100%-3rem)] sm:max-w-[780px]">
        <DialogHeader className="shrink-0 gap-3 border-b border-border/60 px-6 pb-6 pt-7 text-left sm:px-8 sm:pb-7 sm:pt-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F1663C]">
            <Sparkles className="size-4" aria-hidden="true" />
            More room to grow
          </div>
          <DialogTitle className="pr-8 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            {upgradeOptions.length ? 'Upgrade your plan' : 'You’re on our highest plan'}
          </DialogTitle>
          <DialogDescription className="max-w-[600px] text-sm leading-6 sm:text-[15px]">
            {upgradeOptions.length
              ? reasonText
              : 'Your current plan already includes everything we offer.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-7">
          {selfServeOptions.length > 0 && (
            <div className={cn('grid gap-4', selfServeOptions.length > 1 && 'sm:grid-cols-2')}>
              {selfServeOptions.map((tier) => {
                const cfg = PLAN_CONFIGS[tier]
                const featured = Boolean(cfg.featured)

                return (
                  <article
                    key={tier}
                    className={cn(
                      'flex flex-col rounded-[20px] border p-5 transition-[border-color,transform,box-shadow] duration-200 motion-safe:hover:-translate-y-0.5 sm:p-6',
                      featured
                        ? 'border-[#F1663C]/55 bg-[#F1663C]/[0.055] shadow-[0_12px_36px_rgba(241,102,60,0.09)] dark:bg-[#F1663C]/[0.08]'
                        : 'border-border bg-card hover:border-foreground/20',
                    )}
                  >
                    <div className="flex min-h-7 items-start justify-between gap-2">
                      <h3 className="text-base font-semibold tracking-tight">{cfg.label}</h3>
                      {featured && (
                        <span className="rounded-full bg-[#F1663C]/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#db5932] dark:text-[#F49A70]">
                          Most popular
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-4xl font-semibold leading-none tracking-[-0.06em] tabular-nums">
                        {formatPrice(cfg)}
                      </span>
                      <span className="text-sm text-muted-foreground">{cfg.period}</span>
                    </div>
                    <p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">
                      {cfg.tagline}
                    </p>

                    <div className="my-6 h-px bg-border/80" />

                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      What you get
                    </p>
                    <ul className="flex-1 space-y-3.5 text-sm">
                      {reason.kind === 'feature' && cfg.features[reason.feature] && (
                        <li className="flex items-center gap-2.5 rounded-lg bg-[#F1663C]/10 px-2.5 py-2 font-medium text-foreground">
                          <Check className="size-4 shrink-0 text-[#F1663C]" aria-hidden="true" />
                          Includes {FEATURE_LABELS[reason.feature]}
                        </li>
                      )}
                      {visibleMetrics.map((metric) => (
                        <LimitRow
                          key={metric}
                          label={METRIC_LABELS[metric]}
                          value={formatLimit(cfg.limits[metric].max, cfg.limits[metric].window)}
                          highlighted={reason.kind === 'limit' && reason.metric === metric}
                        />
                      ))}
                    </ul>

                    <Button
                      variant={featured ? 'default' : 'outline'}
                      className={cn(
                        'mt-7 h-11 w-full rounded-xl text-sm font-semibold',
                        featured && 'bg-[#F1663C] text-white hover:bg-[#df5d35]',
                      )}
                      disabled={checkout.isPending}
                      onClick={() => checkout.mutate(tier)}
                    >
                      {checkout.isPending && checkout.variables === tier ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Opening checkout…
                        </>
                      ) : (
                        <>
                          {cfg.cta} <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </article>
                )
              })}
            </div>
          )}

          {showCustom && (
            <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-muted/45 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-base font-semibold tracking-tight">Need more room?</h3>
                  <span className="text-xs font-medium text-muted-foreground">
                    Custom · {formatPrice(custom)}{custom.period}
                  </span>
                </div>
                <p className="mt-1.5 max-w-lg text-sm leading-5 text-muted-foreground">
                  {reason.kind === 'feature' && custom.features[reason.feature]
                    ? `${FEATURE_LABELS[reason.feature]}, unlimited capacity, and priority support for your team.`
                    : 'Unlimited capacity, white-label options, and priority support for teams.'}
                </p>
              </div>
              <Button variant="outline" asChild className="h-10 shrink-0 rounded-xl px-4">
                <a href="mailto:billing@allein.ai?subject=Allein%20Custom%20plan">
                  Contact sales <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </div>
          )}

          {upgradeOptions.length > 0 && (
            <div className="pt-1 text-center">
              <Link
                to="/pricing"
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Compare all plan features <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-row items-center justify-center gap-2 border-t border-border/60 px-5 py-4 text-center text-xs leading-5 text-muted-foreground sm:px-8">
          <ShieldCheck className="size-4 shrink-0 text-[#F1663C]" aria-hidden="true" />
          Secure checkout with Stripe. Manage or cancel your plan anytime.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const LimitRow = ({
  label,
  value,
  highlighted,
}: {
  label: string
  value: string
  highlighted: boolean
}) => (
  <li className="flex items-start justify-between gap-3">
    <span className={cn('text-muted-foreground', highlighted && 'font-medium text-foreground')}>
      {label}
    </span>
    <span className={cn('shrink-0 text-right font-medium tabular-nums', highlighted && 'text-[#db5932] dark:text-[#F49A70]')}>
      {value}
    </span>
  </li>
)
