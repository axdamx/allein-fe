import { useState, useEffect, useRef } from 'react'
import { Check, Edit3, MessageSquare, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateLead } from '@/hooks/use-crm'

export const EditableNotesCard = ({ lead }: { lead: { id: string; notes: string | null } }) => {
  const updateLead = useUpdateLead()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(lead.notes ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNotes(lead.notes ?? '')
  }, [lead])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  const handleSave = () => {
    updateLead.mutate({ id: lead.id, notes: notes || undefined })
    setEditing(false)
  }

  const handleCancel = () => {
    setNotes(lead.notes ?? '')
    setEditing(false)
  }

  if (!editing && !lead.notes) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notes</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Plus className="size-3.5" /> Add note
          </Button>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground hover:border-solid hover:bg-muted/50"
          >
            <MessageSquare className="mx-auto mb-1 size-4" />
            Click to add notes
          </button>
        </CardContent>
      </Card>
    )
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notes</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="size-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this lead..."
            rows={5}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Notes</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Edit3 className="size-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
      </CardContent>
    </Card>
  )
}
