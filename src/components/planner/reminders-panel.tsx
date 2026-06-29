import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useReminders, useUpdateReminderStatus } from '@/hooks/use-crm'

export const RemindersPanel = () => {
  const { data: reminders, isLoading } = useReminders()
  const updateStatus = useUpdateReminderStatus()
  const [showAll, setShowAll] = useState(false)

  const allPending = (reminders ?? [])
    .filter((r) => r.status !== 'done')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const preview = allPending.slice(0, 5)
  const hasMore = allPending.length > 5

  if (isLoading) return null
  if (allPending.length === 0) return null

  const ReminderRow = (r: { id: string; title: string; due_at: string }) => {
    const isOverdue = new Date(r.due_at) < new Date()
    return (
      <div
        key={r.id}
        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{r.title}</p>
          <p className={cn('text-xs', isOverdue ? 'text-red-500' : 'text-muted-foreground')}>
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
  }

  return (
    <>
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Bell className="size-4 text-muted-foreground" />
            Upcoming reminders
            <Badge variant="secondary" className="ml-auto text-xs">
              {allPending.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="space-y-1">
            {preview.map(ReminderRow)}
          </div>
          {hasMore && (
            <Button
              variant="link"
              size="sm"
              className="mt-1 h-auto w-full text-xs text-muted-foreground"
              onClick={() => setShowAll(true)}
            >
              View all {allPending.length} reminders
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>All reminders ({allPending.length})</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {allPending.map(ReminderRow)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
