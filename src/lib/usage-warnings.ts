import { toast } from 'sonner'
import type { LimitMetric } from '@/lib/plans'

const LABELS: Record<LimitMetric, string> = {
  agents: 'Agents',
  conversations: 'Conversations',
  messages: 'Messages',
  posts: 'Posts',
  documents: 'Documents',
  leads: 'Leads',
  whatsappMessages: 'WhatsApp messages',
  telegramMessages: 'Telegram messages',
}

export function showUsageWarning({
  metric,
  percentUsed,
  remaining,
  tier,
}: {
  metric: LimitMetric
  percentUsed: number
  remaining: number | null
  tier: string
}) {
  if (remaining === null || remaining < 0) return

  const label = LABELS[metric]

  if (percentUsed >= 100) {
    toast.error(`${label} limit reached`, {
      description: `You've used all your ${label.toLowerCase()} on the ${tier} plan. Upgrade to add more.`,
      action: {
        label: 'Upgrade',
        onClick: () => (window.location.href = '/settings?tab=billing'),
      },
      duration: 10000,
    })
  } else if (percentUsed >= 80) {
    toast.warning(`${label} almost full (${remaining} left)`, {
      description: `You've used ${percentUsed}% of your ${label.toLowerCase()} limit on the ${tier} plan.`,
      action: {
        label: 'Upgrade',
        onClick: () => (window.location.href = '/settings?tab=billing'),
      },
      duration: 8000,
    })
  }
}
