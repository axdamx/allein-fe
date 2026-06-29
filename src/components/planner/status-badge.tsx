import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/hooks/use-planner'

export const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const config: Record<TaskStatus, { label: string; class: string }> = {
    todo: { label: 'To Do', class: 'bg-slate-500/10 text-slate-500' },
    in_progress: { label: 'In Progress', class: 'bg-blue-500/10 text-blue-600' },
    done: { label: 'Done', class: 'bg-emerald-500/10 text-emerald-600' },
  }
  const c = config[status]
  return (
    <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium', c.class)}>
      {c.label}
    </span>
  )
}
