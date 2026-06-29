import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'

import {
  Card,
  CardContent,
} from '@/components/ui/card'
import type { TaskRow } from '@/hooks/use-planner'
import type { LeadRow } from '@/server/crm'

export const QuarterView = ({ tasks, leads }: { tasks: TaskRow[]; leads: LeadRow[] }) => {
  const today = new Date()
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3
  const months = Array.from({ length: 3 }, (_, i) => new Date(today.getFullYear(), quarterStartMonth + i, 1))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">
          Q{Math.floor(today.getMonth() / 3) + 1} {today.getFullYear()}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {months.map((month) => {
          const monthStr = format(month, 'yyyy-MM')
          const monthTasks = tasks.filter((t) => t.planned_date?.startsWith(monthStr))
          const monthLeads = leads.filter((l) => l.scheduled_date?.startsWith(monthStr))
          const todo = monthTasks.filter((t) => t.status === 'todo').length
          const inProgress = monthTasks.filter((t) => t.status === 'in_progress').length
          const done = monthTasks.filter((t) => t.status === 'done').length

          return (
            <Card key={monthStr}>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold">{format(month, 'MMMM')}</h3>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{monthTasks.length + monthLeads.length}</p>
                <p className="text-xs text-muted-foreground">{monthLeads.length} scheduled lead{monthLeads.length === 1 ? '' : 's'} · {monthTasks.length} tasks</p>
                <div className="mt-3 flex gap-2 text-xs">
                  <span className="text-slate-500">{todo} todo</span>
                  <span className="text-blue-500">{inProgress} in progress</span>
                  <span className="text-emerald-500">{done} done</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
