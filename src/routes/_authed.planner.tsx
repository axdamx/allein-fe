import { useState, useCallback, type DragEvent } from 'react'
import {
  Bell,
  Calendar,
  CalendarDays,
  Columns3,
  GripVertical,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from 'lucide-react'
import {
  startOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  format,
  formatDistanceToNow,
} from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useGeneratePlan,
  type TaskRow,
  type TaskStatus,
  type TaskPriority,
  type TimeFrame,
} from '@/hooks/use-planner'
import {
  useLeads,
  useReminders,
  useUpdateReminderStatus,
} from '@/hooks/use-crm'
import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import type { LeadRow } from '@/server/crm'

export const Route = createFileRoute('/_authed/planner')({
  component: PlannerPage,
})

const TIME_FRAMES: { value: TimeFrame; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
]

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'border-t-slate-400' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { status: 'done', label: 'Done', color: 'border-t-emerald-500' },
]

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; class: string }> = {
  low: { label: 'Low', class: 'bg-slate-500/10 text-slate-500' },
  medium: { label: 'Medium', class: 'bg-blue-500/10 text-blue-600' },
  high: { label: 'High', class: 'bg-amber-500/10 text-amber-600' },
  urgent: { label: 'Urgent', class: 'bg-red-500/10 text-red-600' },
}

type ViewMode = 'board' | 'calendar'

function PlannerPage() {
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

// ---------------------------------------------------------------------------
// Kanban Board
// ---------------------------------------------------------------------------

function KanbanBoard() {
  const { data: tasks, isLoading } = useTasks()
  const updateTask = useUpdateTask()
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const grouped = {
    todo: (tasks && !('error' in tasks) ? tasks : []).filter((t) => t.status === 'todo'),
    in_progress: (tasks && !('error' in tasks) ? tasks : []).filter((t) => t.status === 'in_progress'),
    done: (tasks && !('error' in tasks) ? tasks : []).filter((t) => t.status === 'done'),
  }

  const handleDragStart = useCallback((e: DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDragId(taskId)
  }, [])

  const handleDragOver = useCallback((e: DragEvent, status: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent, newStatus: TaskStatus) => {
      e.preventDefault()
      setDragOverCol(null)
      setDragId(null)
      const taskId = e.dataTransfer.getData('text/plain')
      if (!taskId) return
      const targetCol = grouped[newStatus]
      updateTask.mutate({ taskId, status: newStatus, sortOrder: targetCol.length })
    },
    [updateTask, grouped],
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <div key={col.status} className="space-y-3">
            <Skeleton className="h-8 w-24" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (!tasks || 'error' in tasks) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {tasks && 'error' in tasks ? tasks.error : 'Failed to load tasks'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = grouped[col.status]
        const isOver = dragOverCol === col.status
        return (
          <div
            key={col.status}
            className={cn(
              'flex flex-col rounded-lg border bg-muted/30',
              col.color,
              isOver && 'ring-2 ring-primary/50',
            )}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {items.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {dragId ? 'Drop here' : 'No tasks'}
                </div>
              )}
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  isDragging={dragId === task.id}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task Card
// ---------------------------------------------------------------------------

function TaskCard({
  task,
  onDragStart,
  isDragging,
}: {
  task: TaskRow
  onDragStart: (e: DragEvent) => void
  isDragging: boolean
}) {
  const deleteTask = useDeleteTask()
  const updateTask = useUpdateTask()
  const [showDetail, setShowDetail] = useState(false)
  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onClick={() => setShowDetail(true)}
        className={cn(
          'cursor-grab rounded-lg border bg-card p-3 text-sm shadow-sm transition-all hover:shadow-md active:cursor-grabbing',
          isDragging && 'opacity-50 ring-2 ring-primary',
        )}
      >
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-snug">{task.title}</p>
            {task.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium', priority.class)}>
                {priority.label}
              </span>
              {task.generated && (
                <Sparkles className="size-3 text-violet-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            {task.description && (
              <DialogDescription>{task.description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">Status</span>
                <Select
                  value={task.status}
                  onValueChange={(v) => {
                    updateTask.mutate({ taskId: task.id, status: v as TaskStatus })
                    setShowDetail(false)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-muted-foreground">Priority</span>
                <Select
                  value={task.priority}
                  onValueChange={(v) => {
                    updateTask.mutate({ taskId: task.id, priority: v as TaskPriority })
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {task.planned_date && (
              <p className="text-xs text-muted-foreground">
                Planned for {format(new Date(task.planned_date), 'MMM d, yyyy')}
              </p>
            )}
            {task.created_at && (
              <p className="text-xs text-muted-foreground">
                Created {formatDistanceToNow(new Date(task.created_at))} ago
                {task.generated && ' · AI-generated'}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                deleteTask.mutate(task.id)
                setShowDetail(false)
              }}
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Add Task Dialog
// ---------------------------------------------------------------------------

function AddTaskDialog({ timeFrame }: { timeFrame: TimeFrame }) {
  const [open, setOpen] = useState(false)
  const createTask = useCreateTask()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    createTask.mutate(
      { title: title.trim(), description: description.trim() || undefined, priority, timeFrame },
      { onSuccess: () => { setOpen(false); setTitle(''); setDescription(''); setPriority('medium') } },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Add a task to your {timeFrame} plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details..."
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || createTask.isPending}>
              {createTask.isPending && <Loader2 className="size-4 animate-spin" />}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Calendar View
// ---------------------------------------------------------------------------

function CalendarView({ timeFrame }: { timeFrame: TimeFrame }) {
  const { data: tasks, isLoading: tasksLoading } = useTasks(timeFrame)
  const { data: leads } = useLeads()
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

  const taskList = tasks && !('error' in tasks) ? tasks : []
  const scheduledLeads = (leads ?? []).filter((l) => l.scheduled_date)

  switch (timeFrame) {
    case 'day':
      return <DayView tasks={taskList} leads={scheduledLeads} date={today} />
    case 'week':
      return <WeekView tasks={taskList} leads={scheduledLeads} />
    case 'month':
      return <MonthView tasks={taskList} leads={scheduledLeads} />
    case 'quarter':
      return <QuarterView tasks={taskList} leads={scheduledLeads} />
  }
}

// ---------------------------------------------------------------------------
// Day View
// ---------------------------------------------------------------------------

function DayView({ tasks, leads, date }: { tasks: TaskRow[]; leads: LeadRow[]; date: Date }) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayTasks = tasks.filter((t) => t.planned_date === dateStr)
  const dayLeads = leads.filter((l) => l.scheduled_date === dateStr)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium capitalize">
          {format(date, 'EEEE, MMMM d, yyyy')}
        </h2>
        <Badge variant="secondary" className="text-xs">
          {dayTasks.length + dayLeads.length} items
        </Badge>
      </div>

      {dayLeads.length > 0 && (
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-3.5 text-primary" />
              Leads in today's slot
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

      {dayTasks.length > 0 ? (
        <div className="space-y-1">
          {dayTasks.map((task, i) => (
            <div key={task.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
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
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No tasks planned for today
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------

function WeekView({ tasks, leads }: { tasks: TaskRow[]; leads: LeadRow[] }) {
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayTasks = tasks.filter((t) => t.planned_date === dateStr)
          const dayLeads = leads.filter((l) => l.scheduled_date === dateStr)
          const isToday = isSameDay(day, today)

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
                  <div className="mb-1 rounded bg-primary/10 px-1 py-0.5">
                    <p className="text-[9px] font-medium text-primary">
                      {dayLeads.length} lead{dayLeads.length === 1 ? '' : 's'}
                    </p>
                  </div>
                )}
                {dayTasks.slice(0, Math.max(0, 3 - (dayLeads.length > 0 ? 1 : 0))).map((task) => (
                  <div
                    key={task.id}
                    className="truncate rounded bg-muted/50 px-1 py-0.5 text-[10px] font-medium"
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length + (dayLeads.length > 0 ? 1 : 0) > 3 && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    +{dayTasks.length + dayLeads.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Month View
// ---------------------------------------------------------------------------

function MonthView({ tasks, leads }: { tasks: TaskRow[]; leads: LeadRow[] }) {
  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">{format(today, 'MMMM yyyy')}</h2>
      </div>

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
          const isToday = isSameDay(day, today)

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
                  <div className="truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight text-primary"
                    style={{ backgroundColor: 'rgb(59 130 246 / 0.1)' }}
                  >
                    {dayLeads.length} lead{dayLeads.length === 1 ? '' : 's'}
                  </div>
                )}
                {dayTasks.slice(0, dayLeads.length > 0 ? 1 : 2).map((task) => (
                  <div
                    key={task.id}
                    className="truncate rounded px-1 py-0.5 text-[9px] font-medium leading-tight"
                    style={getPriorityStyle(task.priority)}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {(dayTasks.length + (dayLeads.length > 0 ? 1 : 0)) > 2 && (
                  <p className="text-[9px] text-muted-foreground">
                    +{dayTasks.length + dayLeads.length - 2}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quarter View
// ---------------------------------------------------------------------------

function QuarterView({ tasks, leads }: { tasks: TaskRow[]; leads: LeadRow[] }) {
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium', cfg.class)}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
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

function getPriorityStyle(priority: TaskPriority): React.CSSProperties {
  const colors: Record<TaskPriority, string> = {
    low: '#94a3b8',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  }
  return { backgroundColor: `${colors[priority]}15`, color: colors[priority] }
}

// ---------------------------------------------------------------------------
// Reminders Panel
// ---------------------------------------------------------------------------

function RemindersPanel() {
  const { data: reminders, isLoading } = useReminders()
  const updateStatus = useUpdateReminderStatus()

  const pending = (reminders ?? [])
    .filter((r) => r.status !== 'done')
    .slice(0, 5)

  if (isLoading) return null
  if (pending.length === 0) return null

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Bell className="size-4 text-muted-foreground" />
          Upcoming reminders
          <Badge variant="secondary" className="ml-auto text-xs">
            {pending.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 pt-0">
        <div className="space-y-1">
          {pending.map((r) => {
            const isOverdue = new Date(r.due_at) < new Date()
            return (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.title}</p>
                  <p className={cn(
                    'text-xs',
                    isOverdue ? 'text-red-500' : 'text-muted-foreground',
                  )}>
                    {format(new Date(r.due_at), 'MMM d, h:mm a')}
                    {isOverdue && ' (overdue)'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 px-2 text-xs"
                  onClick={() => updateStatus.mutate({ reminderId: r.id, status: 'done' })}
                >
                  Done
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Generate Plan Dialog
// ---------------------------------------------------------------------------

function GeneratePlanDialog({ timeFrame }: { timeFrame: TimeFrame }) {
  const [open, setOpen] = useState(false)
  const generate = useGeneratePlan()
  const [prompt, setPrompt] = useState('')

  const suggestions: Record<TimeFrame, string[]> = {
    day: [
      'Review leads and follow up with top 3 prospects',
      'Check agent performance and adjust prompts',
      'Create content for today\'s social media post',
    ],
    week: [
      'Plan weekly lead generation outreach campaign',
      'Schedule content calendar for the week',
      'Review pipeline and move deals forward',
    ],
    month: [
      'Monthly strategy: review KPIs and set targets',
      'Plan content calendar and campaign for the month',
      'Audit agent performance and optimize configurations',
    ],
    quarter: [
      'Q2 growth strategy: expand lead gen channels',
      'Quarterly review of all agent metrics',
      'Plan product launch campaign for next quarter',
    ],
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    generate.mutate(
      { prompt: prompt.trim(), timeFrame },
      { onSuccess: () => { setOpen(false); setPrompt('') } },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <WandSparkles className="size-4" /> Generate Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Generate {timeFrame} plan</DialogTitle>
            <DialogDescription>
              Describe what you want to accomplish and AI will break it into tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="prompt">What do you want to achieve?</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`e.g. "Generate leads through LinkedIn outreach this ${timeFrame}"`}
                rows={3}
                autoFocus
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions[timeFrame].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!prompt.trim() || generate.isPending}>
              {generate.isPending && <Loader2 className="size-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
