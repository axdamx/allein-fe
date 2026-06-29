import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useUpdateReminderStatus } from '@/hooks/use-crm'
import { cn } from '@/lib/utils'

export const ReminderItem = ({
  reminder,
}: {
  reminder: {
    id: string
    title: string
    due_at: string
    status: string
    description: string | null
  }
}) => {
  const updateStatus = useUpdateReminderStatus()
  const isDone = reminder.status === 'done'
  const isOverdue =
    !isDone && new Date(reminder.due_at) < new Date()

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border p-2',
        isDone && 'opacity-50',
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium',
            isDone && 'line-through',
          )}
        >
          {reminder.title}
        </p>
        <p
          className={cn(
            'text-xs',
            isOverdue
              ? 'text-red-500'
              : 'text-muted-foreground',
          )}
        >
          {format(new Date(reminder.due_at), 'MMM d, h:mm a')}
        </p>
      </div>
      {!isDone && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() =>
            updateStatus.mutate({ reminderId: reminder.id, status: 'done' })
          }
        >
          Done
        </Button>
      )}
    </div>
  )
}
