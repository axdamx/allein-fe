import { Skeleton } from '@/components/ui/skeleton'
import { useTasks } from '@/hooks/use-planner'
import { useLeads } from '@/hooks/use-crm'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import type { TimeFrame, TaskRow } from '@/hooks/use-planner'
import type { LeadRow } from '@/server/crm'
import type { CalendarEventRow } from '@/hooks/use-calendar-events'
import { DayView } from './day-view'
import { WeekView } from './week-view'
import { MonthView } from './month-view'
import { QuarterView } from './quarter-view'

export const CalendarView = ({ timeFrame }: { timeFrame: TimeFrame }) => {
  const { data: tasks, isLoading: tasksLoading } = useTasks(timeFrame)
  const { data: leads } = useLeads()
  const { data: calEvents } = useCalendarEvents()
  const today = new Date()

  const isLoading = tasksLoading
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  const taskList: TaskRow[] = tasks && !('error' in tasks) ? tasks : []
  const scheduledLeads: LeadRow[] = (leads ?? []).filter((l) => l.scheduled_date)
  const calendarEvents: CalendarEventRow[] = calEvents && !('error' in calEvents) ? calEvents : []

  switch (timeFrame) {
    case 'day':
      return <DayView tasks={taskList} leads={scheduledLeads} calendarEvents={calendarEvents} date={today} />
    case 'week':
      return <WeekView tasks={taskList} leads={scheduledLeads} calendarEvents={calendarEvents} />
    case 'month':
      return <MonthView tasks={taskList} leads={scheduledLeads} calendarEvents={calendarEvents} />
    case 'quarter':
      return <QuarterView tasks={taskList} leads={scheduledLeads} />
  }
}
