import { useState, type DragEvent } from 'react'
import { GripVertical, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { TaskRow } from '@/hooks/use-planner'
import { useDeleteTask, useUpdateTask } from '@/hooks/use-planner'
import { PRIORITY_CONFIG } from './constants'
import { TaskDetailDialog } from './task-detail-dialog'

export const TaskCard = ({
  task,
  onDragStart,
  isDragging,
}: {
  task: TaskRow
  onDragStart: (e: DragEvent) => void
  isDragging: boolean
}) => {
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

      <TaskDetailDialog
        task={task}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        onUpdate={(updates) => updateTask.mutate({ taskId: task.id, ...updates })}
        onDelete={() => { deleteTask.mutate(task.id); setShowDetail(false) }}
      />
    </>
  )
}
