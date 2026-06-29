import type { TaskPriority } from '@/hooks/use-planner'

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; class: string }> = {
  low: { label: 'Low', class: 'bg-slate-500/10 text-slate-500' },
  medium: { label: 'Medium', class: 'bg-blue-500/10 text-blue-600' },
  high: { label: 'High', class: 'bg-amber-500/10 text-amber-600' },
  urgent: { label: 'Urgent', class: 'bg-red-500/10 text-red-600' },
}
