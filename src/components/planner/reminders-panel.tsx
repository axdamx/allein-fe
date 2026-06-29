import { useState } from 'react'
import { format } from 'date-fns'
import { Bell, CalendarPlus, Loader2, Mail, MessageSquare, Send } from 'lucide-react'

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
import { useCreateTask } from '@/hooks/use-planner'
import {
  useReminders,
  useUpdateReminderStatus,
  useSendReminderToWhatsApp,
  useSendReminderToTelegram,
} from '@/hooks/use-crm'
import type { ReminderRow } from '@/server/crm'

const DetailDialog = ({
  reminder,
  open,
  onClose,
}: {
  reminder: ReminderRow
  open: boolean
  onClose: () => void
}) => {
  const isOverdue = new Date(reminder.due_at) < new Date()
  const createTask = useCreateTask()
  const sendWhatsApp = useSendReminderToWhatsApp()
  const sendTelegram = useSendReminderToTelegram()

  const handleAddToPlanner = () => {
    createTask.mutate(
      {
        title: reminder.title,
        description: reminder.description ?? undefined,
        plannedDate: reminder.due_at?.split('T')[0],
        timeFrame: 'day',
      },
      { onSuccess: () => onClose() },
    )
  }

  const handleWhatsApp = () => {
    sendWhatsApp.mutate(reminder.id, { onSuccess: () => onClose() })
  }

  const handleTelegram = () => {
    sendTelegram.mutate(reminder.id, { onSuccess: () => onClose() })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{reminder.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {reminder.description && (
            <p className="text-sm text-muted-foreground">{reminder.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
              Due {format(new Date(reminder.due_at), 'MMM d, yyyy h:mm a')}
              {isOverdue && ' (overdue)'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleAddToPlanner}
              disabled={createTask.isPending}
            >
              {createTask.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="size-3.5" />
              )}
              Add to planner
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              asChild
            >
              <a href={`mailto:?subject=Reminder: ${encodeURIComponent(reminder.title)}&body=${encodeURIComponent(`${reminder.title}\n\n${reminder.description ? reminder.description + '\n\n' : ''}Due: ${format(new Date(reminder.due_at), 'MMM d, yyyy h:mm a')}`)}`}>
                <Mail className="size-3.5" />
                Email me
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleWhatsApp}
              disabled={sendWhatsApp.isPending}
            >
              {sendWhatsApp.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MessageSquare className="size-3.5" />
              )}
              WhatsApp me
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleTelegram}
              disabled={sendTelegram.isPending}
            >
              {sendTelegram.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Telegram me
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const RemindersPanel = () => {
  const { data: reminders, isLoading } = useReminders()
  const updateStatus = useUpdateReminderStatus()
  const [showAll, setShowAll] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<ReminderRow | null>(null)

  const allPending = (reminders ?? [])
    .filter((r) => r.status !== 'done')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const preview = allPending.slice(0, 5)
  const hasMore = allPending.length > 5

  if (isLoading) return null
  if (allPending.length === 0) return null

  const handleClick = (r: ReminderRow) => setSelectedReminder(r)

  const ReminderRow = (r: ReminderRow) => {
    const isOverdue = new Date(r.due_at) < new Date()
    return (
      <div
        key={r.id}
        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
        onClick={() => handleClick(r)}
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
          onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ reminderId: r.id, status: 'done' }) }}
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

      {selectedReminder && (
        <DetailDialog
          reminder={selectedReminder}
          open
          onClose={() => setSelectedReminder(null)}
        />
      )}
    </>
  )
}
