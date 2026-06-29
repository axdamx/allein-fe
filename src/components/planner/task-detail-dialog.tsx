import { Trash2 } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskRow, TaskStatus, TaskPriority } from '@/hooks/use-planner'

export const TaskDetailDialog = ({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: TaskRow
  open: boolean
  onClose: () => void
  onUpdate: (updates: { status?: TaskStatus; priority?: TaskPriority }) => void
  onDelete: () => void
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
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
                  onUpdate({ status: v as TaskStatus })
                  onClose()
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
                onValueChange={(v) => onUpdate({ priority: v as TaskPriority })}
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
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
