import { Check, Sparkles } from 'lucide-react'

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
import {
  PLAN_CONFIGS,
  PLAN_ORDER,
  isHigherTier,
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
                    {cfg.price === null
                      ? 'Custom'
                      : cfg.price === 0
                        ? 'Free'
                        : `$${cfg.price}`}
                    {cfg.price !== null && cfg.price > 0 && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        /mo
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cfg.tagline}
                  </p>
                </div>

                <ul className="mb-4 flex-1 space-y-1.5 text-xs">
                  <LimitRow
                    label="Agents"
                    value={cfg.limits.agents.max}
                  />
                  <LimitRow
                    label="Messages"
                    value={cfg.limits.messages.max}
                  />
                  <LimitRow label="Posts" value={cfg.limits.posts.max} />
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
                  onClick={() => {
                    // Phase 2+ will wire this to Stripe checkout.
                    onOpenChange(false)
                  }}
                >
                  {cfg.cta}
                </Button>
              </div>
            )
          })}
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          Billing integration ships in Phase 7. For now these are plan presets.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const LimitRow = ({ label, value }: { label: string; value: number | null }) => (
  <li className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value === null ? '∞' : value}</span>
  </li>
)
