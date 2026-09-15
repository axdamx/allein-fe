import { useState } from 'react'
import { Calendar, CalendarDays, Columns3 } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
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
  const { prefill } = Route.useSearch()
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week')
  const [view, setView] = useState<ViewMode>('board')

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="flex h-full flex-col">
        <div className="shrink-0">
          <PageHeader
            eyebrow="Focus and follow-through"
            icon={Calendar}
            title="Planner"
            description="Shape priorities into a practical schedule, then let your AI help protect the time to deliver."
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <GeneratePlanDialog
                  timeFrame={timeFrame}
                  initialPrompt={prefill ?? ''}
                  defaultOpen={Boolean(prefill)}
                />
                <ImportCalendarDialog />
                <AddTaskDialog timeFrame={timeFrame} />
              </div>
            )}
          />

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

            <div className="flex items-center rounded-full border border-black/5 bg-white/60 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
              <button
                onClick={() => setView('board')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'board' ? 'bg-[#171713] text-[#FFF9F1] shadow-sm dark:bg-[#F1663C] dark:text-[#171713]' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Columns3 className="size-3.5" />
                Board
              </button>
              <button
                onClick={() => setView('calendar')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  view === 'calendar' ? 'bg-[#171713] text-[#FFF9F1] shadow-sm dark:bg-[#F1663C] dark:text-[#171713]' : 'text-muted-foreground hover:text-foreground',
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
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {view === 'board' ? <KanbanBoard /> : <CalendarView timeFrame={timeFrame} />}
        </div>
      </div>
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/planner')({
  validateSearch: (search: Record<string, unknown>): { prefill?: string } => ({
    prefill: typeof search.prefill === 'string' ? search.prefill : undefined,
  }),
  component: PlannerPage,
})
