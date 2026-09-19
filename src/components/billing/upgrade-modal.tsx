import { ArrowUpRight, Check, Loader2, Sparkles } from 'lucide-react'

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
  scheduledPosts: 'Scheduled posts',
  teamSeats: 'Team seats',
  apiAccess: 'API access',
  whiteLabel: 'White-label',
  prioritySupport: 'Priority support',
  whatsappBroadcast: 'WhatsApp broadcast',
  telegramBot: 'Telegram bot',
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5 text-primary" />
            Upgrade your plan
          </DialogTitle>
          <DialogDescription>{reasonText}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {upgradeOptions.slice(0, 3).map((tier) => {
            const cfg = PLAN_CONFIGS[tier]
            return (
              <div
                key={tier}
                className={cn(
                  'flex flex-col rounded-lg border p-4',
                  cfg.featured && 'border-primary ring-1 ring-primary',
                )}
                style={{ borderColor: cfg.featured ? undefined : cfg.accent }}
              >
                <div className="mb-2">
                  <h3 className="font-semibold" style={{ color: cfg.accent }}>
                    {cfg.label}
                  </h3>
                  <p className="text-2xl font-bold">
                    {formatPrice(cfg, true)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cfg.tagline}
                  </p>
                </div>

                <ul className="mb-4 flex-1 space-y-1.5 text-xs">
                  <LimitRow
                    label="AI agents"
                    value={cfg.limits.agents.max}
                  />
                  <LimitRow
                    label="Messages"
                    value={cfg.limits.messages.max}
                    suffix={cfg.limits.messages.window === 'day' ? '/day' : undefined}
                  />
                  <LimitRow
                    label="Marketing posts"
                    value={cfg.limits.posts.max}
                    suffix={cfg.limits.posts.window === 'day' ? '/day' : undefined}
                  />
                  <LimitRow
                    label="Documents"
                    value={cfg.limits.documents.max}
                  />
                  {reason.kind === 'feature' &&
                    cfg.features[reason.feature] && (
                      <li className="flex items-center gap-1.5 font-medium text-primary">
                        <Check className="size-3" />
                        {FEATURE_LABELS[reason.feature]}
                      </li>
                    )}
                </ul>

                <Button
                  variant={cfg.featured ? 'default' : 'outline'}
                  className="w-full"
                  asChild={tier === 'custom'}
                  disabled={tier !== 'custom' && checkout.isPending}
                  onClick={
                    tier === 'lite' || tier === 'pro'
                      ? () => checkout.mutate(tier)
                      : undefined
                  }
                >
                  {tier === 'custom' ? (
                    <a href="mailto:billing@allein.ai?subject=Allein%20Custom%20plan">
                      Contact sales <ArrowUpRight />
                    </a>
                  ) : checkout.isPending && checkout.variables === tier ? (
                    <>
                      <Loader2 className="animate-spin" /> Opening checkout
                    </>
                  ) : (
                    cfg.cta
                  )}
                </Button>
              </div>
            )
          })}
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          Secure checkout and subscription management are powered by Stripe.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const LimitRow = ({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | null
  suffix?: string
}) => (
  <li className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium tabular-nums">
      {value === null ? '∞' : value}
      {suffix ? <span className="text-muted-foreground"> {suffix}</span> : null}
    </span>
  </li>
)
