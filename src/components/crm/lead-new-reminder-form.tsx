import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateReminder } from '@/hooks/use-crm'

export const NewReminderForm = ({ leadId }: { leadId: string }) => {
  const createReminder = useCreateReminder()
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !dueAt) return
    createReminder.mutate(
      {
        title,
        due_at: new Date(dueAt).toISOString(),
        lead_id: leadId,
      },
      {
        onSuccess: (result) => {
          if (!('error' in result)) {
            setTitle('')
            setDueAt('')
          }
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        placeholder="Follow-up task..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={createReminder.isPending}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </form>
  )
}
