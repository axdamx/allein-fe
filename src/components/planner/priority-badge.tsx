import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/hooks/use-planner'
import { PRIORITY_CONFIG } from './constants'

export const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium', cfg.class)}>
      {cfg.label}
    </span>
  )
}
