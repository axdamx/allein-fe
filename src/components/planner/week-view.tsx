import { useState } from 'react'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
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
import type { TaskRow } from '@/hooks/use-planner'
import type { LeadRow } from '@/server/crm'
import type { CalendarEventRow } from '@/hooks/use-calendar-events'
import { TaskDetailDialog } from './task-detail-dialog'

export const WeekView = ({ tasks, leads, calendarEvents, currentDate }: { tasks: TaskRow[]; leads: LeadRow[]; calendarEvents: CalendarEventRow[]; currentDate: Date }) => {
  const today = new Date()
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)
  const [leadDay, setLeadDay] = useState<{ leads: LeadRow[]; date: string } | null>(null)
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()

  return (
    <div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayTasks = tasks.filter((t) => t.planned_date === dateStr)
          const dayLeads = leads.filter((l) => l.scheduled_date === dateStr)
          const dayCalEvents = calendarEvents.filter((e) => e.start_date === dateStr)
          const isToday = isSameDay(day, today)
          const maxItems = 4
          const leadCount = dayLeads.length > 0 ? 1 : 0
          const calCount = dayCalEvents.length > 0 ? 1 : 0
          const taskLimit = Math.max(0, maxItems - leadCount - calCount)
          const overflow = dayTasks.length + leadCount + calCount - maxItems

          return (
            <div
              key={dateStr}
              className={cn(
                'flex flex-col rounded-lg border bg-card p-2',
                isToday && 'ring-2 ring-primary',
              )}
            >
              <div className="mb-1 text-center">
                <p className="text-[10px] font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </p>
                <p className={cn('text-sm font-semibold', isToday && 'text-primary')}>
                  {format(day, 'd')}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                {dayLeads.length > 0 && (
                  <button
                    onClick={() => setLeadDay({ leads: dayLeads, date: dateStr })}
                    className="mb-0.5 w-full rounded bg-primary/10 px-1 py-0.5 text-left hover:bg-primary/20"
                  >
                    <p className="text-[9px] font-medium text-primary">
                      {dayLeads.length} lead{dayLeads.length === 1 ? '' : 's'}
                    </p>
                  </button>
                )}
                {dayCalEvents.length > 0 && (
                  <div className="truncate rounded bg-emerald-500/10 px-1 py-0.5 text-[9px] font-medium text-emerald-600">
                    {dayCalEvents.length} event{dayCalEvents.length === 1 ? '' : 's'}
                  </div>
                )}
                {dayTasks.slice(0, taskLimit).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="truncate rounded bg-muted/50 px-1 py-0.5 text-left text-[10px] font-medium hover:bg-muted"
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
                {overflow > 0 && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    +{overflow} more
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
