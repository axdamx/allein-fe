import { useState } from 'react'
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  format,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
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

const navigate = {
  day: { next: addDays, prev: subDays, format: 'MMMM d, yyyy' },
  week: { next: addWeeks, prev: subWeeks, format: "'Week of' MMM d, yyyy" },
  month: { next: addMonths, prev: subMonths, format: 'MMMM yyyy' },
  quarter: { next: addQuarters, prev: subQuarters, format: "'Q'Q yyyy" },
} as const

export const CalendarView = ({ timeFrame }: { timeFrame: TimeFrame }) => {
  const { data: tasks, isLoading: tasksLoading } = useTasks(timeFrame)
  const { data: leads } = useLeads()
  const { data: calEvents } = useCalendarEvents()
  const [currentDate, setCurrentDate] = useState(new Date())

  const nav = navigate[timeFrame]

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setCurrentDate((d) => nav.prev(d, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-[160px] text-center text-sm font-medium">
            {format(currentDate, nav.format)}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setCurrentDate((d) => nav.next(d, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>
      </div>

      {timeFrame === 'day' && (
        <DayView tasks={taskList} leads={scheduledLeads} calendarEvents={calendarEvents} date={currentDate} />
      )}
      {timeFrame === 'week' && (
        <WeekView tasks={taskList} leads={scheduledLeads} calendarEvents={calendarEvents} currentDate={currentDate} />
      )}
      {timeFrame === 'month' && (
        <MonthView tasks={taskList} leads={scheduledLeads} calendarEvents={calendarEvents} currentDate={currentDate} />
      )}
      {timeFrame === 'quarter' && (
        <QuarterView tasks={taskList} leads={scheduledLeads} currentDate={currentDate} />
      )}
    </div>
  )
}
