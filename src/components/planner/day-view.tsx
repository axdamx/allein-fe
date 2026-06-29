import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarDays, Sparkles, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import { useDeleteTask, useUpdateTask } from '@/hooks/use-planner'
import type { TaskRow } from '@/hooks/use-planner'
import type { LeadRow } from '@/server/crm'
import type { CalendarEventRow } from '@/hooks/use-calendar-events'
import { PriorityBadge } from './priority-badge'
import { StatusBadge } from './status-badge'
import { TaskDetailDialog } from './task-detail-dialog'

export const DayView = ({ tasks, leads, calendarEvents, date }: { tasks: TaskRow[]; leads: LeadRow[]; calendarEvents: CalendarEventRow[]; date: Date }) => {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayTasks = tasks.filter((t) => t.planned_date === dateStr)
  const dayLeads = leads.filter((l) => l.scheduled_date === dateStr)
  const dayCalEvents = calendarEvents.filter((e) => e.start_date === dateStr)
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null)
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium capitalize">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </h2>
        <Badge variant="secondary" className="text-xs">
          {dayTasks.length + dayLeads.length + dayCalEvents.length} items
        </Badge>
      </div>

      {dayCalEvents.length > 0 && (
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-3.5 text-primary" />
              Calendar Events
              <Badge variant="secondary" className="ml-auto text-xs">{dayCalEvents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 pt-0">
            <div className="space-y-1">
              {dayCalEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{ev.title}</p>
                    {ev.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{ev.description}</p>
                    )}
                  </div>
                  {ev.location && (
                    <span className="text-[10px] text-muted-foreground">{ev.location}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dayLeads.length > 0 && (
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-3.5 text-primary" />
              Scheduled leads
              <Badge variant="secondary" className="ml-auto text-xs">{dayLeads.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 pt-0">
            <div className="space-y-1">
              {dayLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to="/crm/leads/$leadId"
                  params={{ leadId: lead.id }}
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-3.5 text-muted-foreground" />
            Tasks
            <Badge variant="secondary" className="ml-auto text-xs">{dayTasks.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          {dayTasks.length > 0 ? (
            <div className="space-y-1">
              {dayTasks.map((task, i) => (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/50"
                >
                  <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                    )}
                  </div>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">No tasks for this day</p>
          )}
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => updateTask.mutate({ taskId: selectedTask.id, ...updates })}
          onDelete={() => { deleteTask.mutate(selectedTask.id); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}
