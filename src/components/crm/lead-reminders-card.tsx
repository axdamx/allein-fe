import { Bell } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NewReminderForm } from '@/components/crm/lead-new-reminder-form'
import { ReminderItem } from '@/components/crm/lead-reminder-item'

export const RemindersCard = ({ leadId, reminders }: { leadId: string; reminders: { id: string; title: string; due_at: string; status: string; description: string | null }[] }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4" /> Follow-ups
        </CardTitle>
        <CardDescription>Time-specific reminders for this lead</CardDescription>
      </CardHeader>
      <CardContent>
        <NewReminderForm leadId={leadId} />
        <div className="mt-3 space-y-2">
          {reminders.length > 0 ? (
            reminders.map((r) => <ReminderItem key={r.id} reminder={r} />)
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No follow-ups yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
