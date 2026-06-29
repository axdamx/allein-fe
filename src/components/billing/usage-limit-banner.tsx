import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import { cn } from '@/lib/utils'
import type { LimitMetric } from '@/lib/plans'

const METRIC_LABELS: Record<LimitMetric, { singular: string; plural: string }> =
  {
    agents: { singular: 'agent', plural: 'agents' },
    conversations: {
      singular: 'conversation',
      plural: 'conversations',
    },
    messages: { singular: 'message', plural: 'messages' },
    posts: { singular: 'post', plural: 'posts' },
    documents: { singular: 'document', plural: 'documents' },
    leads: { singular: 'lead', plural: 'leads' },
    whatsappMessages: { singular: 'WhatsApp message', plural: 'WhatsApp messages' },
    telegramMessages: { singular: 'Telegram message', plural: 'Telegram messages' },
  }

/**
 * Non-blocking banner that appears when the user is at or near a usage limit.
 * Pass `metric` to watch a specific counter, or omit to auto-detect the
 * most-consumed metered resource.
 *
 * The banner is dismissible per-session (stored in component state).
 */
export const UsageLimitBanner = ({
  metric,
  /** Threshold percentage (0–100) at which to show the warning. Default 80. */
  threshold = 80,
  className,
}: {
  metric?: LimitMetric
  threshold?: number
  className?: string
}) => {
  const { percentUsed, usage, config, tier } = usePlan()
  const [dismissed, setDismissed] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  if (dismissed) return null

  // Find which metric is closest to its limit (if not specified).
  const metrics: LimitMetric[] = metric
    ? [metric]
    : ['agents', 'conversations', 'messages', 'posts', 'documents', 'leads']

  const triggered = metrics
    .map((m) => ({
      metric: m,
      percent: percentUsed(m),
      used: usage[m],
      max: config.limits[m].max,
    }))
    .filter((m) => m.percent >= threshold)
    .sort((a, b) => b.percent - a.percent)[0]

  if (!triggered) return null

  const label =
    METRIC_LABELS[triggered.metric][
      triggered.used === 1 ? 'singular' : 'plural'
    ]
  const isAtLimit = triggered.percent >= 100

  return (
    <>
      <div
        role="status"
        className={cn(
          'flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm',
          isAtLimit
            ? 'border-destructive/30 bg-destructive/5 text-destructive'
            : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400',
          className,
        )}
      >
        <AlertTriangle className="size-4 shrink-0" />

        <div className="flex-1">
          {isAtLimit ? (
            <span className="font-medium">
              You've reached your {label} limit ({triggered.max}) on the{' '}
              {config.label} plan.
            </span>
          ) : (
            <span>
              You've used {triggered.percent}% of your {label} (
              {triggered.used}
              {triggered.max === null ? '' : `/${triggered.max}`}).
            </span>
          )}

          {triggered.max !== null && (
            <Progress
              value={triggered.percent}
              className="mt-1.5 h-1.5"
            />
          )}
        </div>

        <Button
          size="sm"
          variant={isAtLimit ? 'destructive' : 'outline'}
          onClick={() => setUpgradeOpen(true)}
          className="shrink-0"
        >
          {isAtLimit ? 'Upgrade now' : 'Upgrade'}
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        reason={{
          kind: 'limit',
          metric: triggered.metric,
          used: triggered.used,
          max: triggered.max,
        }}
      />
    </>
  )
}
