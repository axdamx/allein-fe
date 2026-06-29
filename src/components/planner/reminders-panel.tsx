import { format } from 'date-fns'
import { Bell } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useReminders, useUpdateReminderStatus } from '@/hooks/use-crm'

export const RemindersPanel = () => {
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
