import { cn } from '@/lib/utils'
import type { LeadStatus } from '@/server/crm'

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; className: string; dot: string }
> = {
  new: {
    label: 'New',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  contacted: {
    label: 'Contacted',
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  qualified: {
    label: 'Qualified',
    className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  negotiation: {
    label: 'Negotiation',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  won: {
    label: 'Won',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  lost: {
    label: 'Lost',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
  },
}

export function LeadStatusBadge({
  status,
  className,
}: {
  status: LeadStatus
  className?: string
}) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        cfg.className,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}
