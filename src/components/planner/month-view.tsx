import { useState } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isSameDay } from 'date-fns'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import { useDeleteTask, useUpdateTask } from '@/hooks/use-planner'
import type { TaskRow, TaskPriority } from '@/hooks/use-planner'
import type { LeadRow } from '@/server/crm'
import type { CalendarEventRow } from '@/hooks/use-calendar-events'
import { TaskDetailDialog } from './task-detail-dialog'

const getPriorityStyle = (priority: TaskPriority): React.CSSProperties => {
  const colors: Record<TaskPriority, string> = {
    low: '#94a3b8',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  }
  return { backgroundColor: `${colors[priority]}15`, color: colors[priority] }
}

export const MonthView = ({ tasks, leads, calendarEvents, currentDate }: { tasks: TaskRow[]; leads: LeadRow[]; calendarEvents: CalendarEventRow[]; currentDate: Date }) => {
  const today = new Date()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)
  const [leadDay, setLeadDay] = useState<{ leads: LeadRow[]; date: string } | null>(null)
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()

  const maxItems = 2

  return (
    <div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted/30">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="bg-muted/50 px-2 py-1 text-center text-[10px] font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayTasks = tasks.filter((t) => t.planned_date === dateStr)
          const dayLeads = leads.filter((l) => l.scheduled_date === dateStr)
          const dayCalEvents = calendarEvents.filter((e) => e.start_date === dateStr)
          const isToday = isSameDay(day, today)

          const leadCount = dayLeads.length > 0 ? 1 : 0
          const calCount = dayCalEvents.length > 0 ? 1 : 0
          const taskLimit = Math.max(0, maxItems - leadCount - calCount)
          const overflow = dayTasks.length + leadCount + calCount - maxItems

          return (
            <div
              key={dateStr}
              className={cn(
                'min-h-[80px] bg-card p-1.5',
                isToday && 'bg-primary/5',
              )}
            >
              <p className={cn('mb-0.5 text-xs font-medium', isToday && 'text-primary')}>
                {format(day, 'd')}
              </p>
              <div className="flex flex-col gap-0.5">
                {dayLeads.length > 0 && (
                  <button
                    onClick={() => setLeadDay({ leads: dayLeads, date: dateStr })}
                    className="w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium leading-tight text-primary hover:bg-primary/10"
                    style={{ backgroundColor: 'rgb(59 130 246 / 0.1)' }}
                  >
                    {dayLeads.length} lead{dayLeads.length === 1 ? '' : 's'}
                  </button>
                )}
                {dayCalEvents.length > 0 && (
                  <div className="truncate rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-medium leading-tight text-emerald-600">
                    {dayCalEvents.length} event{dayCalEvents.length === 1 ? '' : 's'}
                  </div>
                )}
                {dayTasks.slice(0, taskLimit).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium leading-tight hover:opacity-80"
                    style={getPriorityStyle(task.priority)}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
                {overflow > 0 && (
                  <p className="text-[9px] text-muted-foreground">
                    +{overflow}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => updateTask.mutate({ taskId: selectedTask.id, ...updates })}
          onDelete={() => { deleteTask.mutate(selectedTask.id); setSelectedTask(null) }}
        />
      )}

      {leadDay && (
        <Dialog open onOpenChange={() => setLeadDay(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Leads for {format(new Date(leadDay.date), 'MMM d, yyyy')}</DialogTitle>
            </DialogHeader>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {leadDay.leads.map((lead) => (
                <Link
                  key={lead.id}
                  to="/crm/leads/$leadId"
                  params={{ leadId: lead.id }}
                  onClick={() => setLeadDay(null)}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.company || lead.email || '—'} · <span className="capitalize">{lead.status}</span>
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
