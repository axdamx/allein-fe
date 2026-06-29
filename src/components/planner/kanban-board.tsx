import { useState, useCallback, type DragEvent } from 'react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTasks, useUpdateTask } from '@/hooks/use-planner'
import type { TaskStatus } from '@/hooks/use-planner'
import { TaskCard } from './task-card'

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To Do', color: 'border-t-slate-400' },
  { status: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { status: 'done', label: 'Done', color: 'border-t-emerald-500' },
]

export const KanbanBoard = () => {
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
