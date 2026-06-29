import { useState } from 'react'
import { Calendar, CalendarDays, Columns3 } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { TimeFrame } from '@/hooks/use-planner'
import { AddTaskDialog } from '@/components/planner/add-task-dialog'
import { CalendarView } from '@/components/planner/calendar-view'
import { GeneratePlanDialog } from '@/components/planner/generate-plan-dialog'
import { ImportCalendarDialog } from '@/components/planner/import-calendar-dialog'
import { KanbanBoard } from '@/components/planner/kanban-board'
import { RemindersPanel } from '@/components/planner/reminders-panel'

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
]

type ViewMode = 'board' | 'calendar'

const PlannerPage = () => {
  const { user } = Route.useRouteContext()
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week')
  const [view, setView] = useState<ViewMode>('board')

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
          </div>
          <div className="flex items-center gap-2">
            <GeneratePlanDialog timeFrame={timeFrame} />
            <ImportCalendarDialog />
            <AddTaskDialog timeFrame={timeFrame} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Plan your tasks and generate AI-powered schedules.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        {view === 'calendar' && (
          <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as TimeFrame)}>
            <TabsList>
              {TIME_FRAMES.map((tf) => (
                <TabsTrigger key={tf.value} value={tf.value}>
                  {tf.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        {view === 'board' && <div />}

        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          <button
            onClick={() => setView('board')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Columns3 className="size-3.5" />
            Board
          </button>
          <button
            onClick={() => setView('calendar')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarDays className="size-3.5" />
            Calendar
          </button>
        </div>
      </div>

      <div className="mt-4">
        <RemindersPanel />
      </div>

      <div className="mt-4">
        {view === 'board' ? <KanbanBoard /> : <CalendarView timeFrame={timeFrame} />}
      </div>
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/planner')({
  component: PlannerPage,
})
