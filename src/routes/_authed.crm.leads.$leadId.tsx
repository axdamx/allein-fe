import { useState, useRef, useEffect } from 'react'
import {
  ArrowLeft,
  Bell,
  Calendar,
  CalendarDays,
  Check,
  DollarSign,
  Edit3,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Building2,
  Tag,
  X,
} from 'lucide-react'
import { addDays, format, formatDistanceToNow, isToday, isPast, parseISO } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  useLeads,
  useUpdateLead,
  useReminders,
  useCreateReminder,
  useUpdateReminderStatus,
  useDeals,
} from '@/hooks/use-crm'
import { LEAD_STATUSES } from '@/server/crm'
import type { LeadSourceType } from '@/server/crm'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/crm/leads/$leadId')({
  component: LeadDetailPage,
})

const SOURCE_OPTIONS: { value: LeadSourceType; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
]

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+7 days', days: 7 },
]

function LeadDetailPage() {
  const { leadId } = Route.useParams()
  const { data: leads, isLoading } = useLeads()
  const { data: reminders } = useReminders()
  const { data: deals } = useDeals()

  const lead = leads?.find((l) => l.id === leadId)
  const leadReminders = (reminders ?? []).filter(
    (r) => r.lead_id === leadId,
  )
  const leadDeals = (deals ?? []).filter(
    (d) => d.lead_id === leadId,
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!lead) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Lead not found.</p>
          <Button asChild variant="link">
            <Link to="/crm/leads">Back to leads</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/crm/leads">
            <ArrowLeft className="size-4" /> Back to leads
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {lead.name}
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              {lead.last_contacted_at && (
                <> &middot; Last contacted {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}</>
              )}
            </p>
          </div>
          <LeadStatusDropdown leadId={lead.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <EditableContactCard lead={lead} />
          <EditableNotesCard lead={lead} />

          {leadDeals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="size-4" /> Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {leadDeals.map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.stage.replace(/_/g, ' ')} &middot; {deal.probability}%
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        ${Number(deal.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <CardSlot leadId={lead.id} lead={lead} />
          <RemindersCard leadId={lead.id} reminders={leadReminders} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card Slot — the "place this card in a date slot" UX
// ---------------------------------------------------------------------------

function CardSlot({ leadId, lead }: { leadId: string; lead: { scheduled_date: string | null; name: string } }) {
  const updateLead = useUpdateLead()
  const [customDate, setCustomDate] = useState('')

  const scheduled = lead.scheduled_date
  const hasSlot = !!scheduled
  const slotIsToday = scheduled ? isToday(parseISO(scheduled)) : false
  const slotIsPast = scheduled ? isPast(parseISO(scheduled)) && !isToday(parseISO(scheduled)) : false

  function placeCard(daysFromNow: number) {
    const date = addDays(new Date(), daysFromNow)
    updateLead.mutate({
      id: leadId,
      scheduled_date: format(date, 'yyyy-MM-dd'),
    })
  }

  function placeCustomDate() {
    if (!customDate) return
    updateLead.mutate({
      id: leadId,
      scheduled_date: customDate,
    })
    setCustomDate('')
  }

  function removeFromSlot() {
    updateLead.mutate({
      id: leadId,
      scheduled_date: null,
    })
  }

  return (
    <Card className={cn(hasSlot && 'border-primary/30')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4" /> Card Slot
        </CardTitle>
        <CardDescription>
          Choose a date to pull this card from the box
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasSlot ? (
          <div className="space-y-3">
            <div
              className={cn(
                'rounded-lg border-2 p-3 text-center transition-colors',
                slotIsToday
                  ? 'border-primary bg-primary/5'
                  : slotIsPast
                    ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                    : 'border-muted bg-muted/30',
              )}
            >
              <p className="text-xs text-muted-foreground">Placed in slot</p>
              <p className={cn('mt-1 text-lg font-semibold', slotIsToday && 'text-primary')}>
                {scheduled && format(parseISO(scheduled), 'EEEE, MMM d, yyyy')}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {slotIsToday
                  ? 'Due today — time to work this card!'
                  : slotIsPast
                    ? 'Overdue — move it to a new date'
                    : formatDistanceToNow(parseISO(scheduled!), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Calendar className="size-3.5" /> Move
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick dates</p>
                    <div className="grid grid-cols-2 gap-1">
                      {QUICK_DATES.map((qd) => (
                        <Button
                          key={qd.label}
                          size="sm"
                          variant="ghost"
                          className="justify-start text-xs"
                          onClick={() => placeCard(qd.days)}
                        >
                          {qd.label}
                        </Button>
                      ))}
                    </div>
                    <div className="border-t pt-2">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Custom date</p>
                      <div className="flex gap-1">
                        <Input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={placeCustomDate}
                          disabled={!customDate}
                          className="h-8 shrink-0"
                        >
                          <Check className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                onClick={removeFromSlot}
              >
                <X className="size-3.5" /> Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-center">
              <CalendarDays className="mx-auto mb-1 size-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                This card is not in any date slot
              </p>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Place in slot:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_DATES.map((qd) => (
                <Button
                  key={qd.label}
                  size="sm"
                  variant="outline"
                  onClick={() => placeCard(qd.days)}
                  className="text-xs"
                >
                  {qd.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-8 text-xs"
                placeholder="Pick a date"
              />
              <Button
                size="sm"
                onClick={placeCustomDate}
                disabled={!customDate}
                className="h-8 shrink-0"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Reminders Card
// ---------------------------------------------------------------------------

function RemindersCard({ leadId, reminders }: { leadId: string; reminders: { id: string; title: string; due_at: string; status: string; description: string | null }[] }) {
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

// ---------------------------------------------------------------------------
// Editable contact info card
// ---------------------------------------------------------------------------

function EditableContactCard({ lead }: { lead: { id: string; name: string; email: string | null; phone: string | null; company: string | null; source: string; value: number; tags: string[]; scheduled_date: string | null } }) {
  const updateLead = useUpdateLead()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(lead.name)
  const [email, setEmail] = useState(lead.email ?? '')
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [company, setCompany] = useState(lead.company ?? '')
  const [source, setSource] = useState(lead.source)
  const [value, setValue] = useState(String(lead.value || ''))

  useEffect(() => {
    setName(lead.name)
    setEmail(lead.email ?? '')
    setPhone(lead.phone ?? '')
    setCompany(lead.company ?? '')
    setSource(lead.source)
    setValue(String(lead.value || ''))
  }, [lead])

  function handleSave() {
    updateLead.mutate({
      id: lead.id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      source: source as LeadSourceType,
      value: Number(value) || 0,
    })
    setEditing(false)
  }

  function handleCancel() {
    setName(lead.name)
    setEmail(lead.email ?? '')
    setPhone(lead.phone ?? '')
    setCompany(lead.company ?? '')
    setSource(lead.source)
    setValue(String(lead.value || ''))
    setEditing(false)
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contact information</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="size-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineField label="Name" icon={<Edit3 className="size-4" />}>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Email" icon={<Mail className="size-4" />}>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Phone" icon={<Phone className="size-4" />}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Company" icon={<Building2 className="size-4" />}>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Source" icon={<Calendar className="size-4" />}>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </InlineField>
            <InlineField label="Deal value" icon={<DollarSign className="size-4" />}>
              <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-sm" type="number" />
            </InlineField>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contact information</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Edit3 className="size-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={<Edit3 className="size-4" />} label="Name" value={lead.name} />
          <InfoRow icon={<Mail className="size-4" />} label="Email" value={lead.email} />
          <InfoRow icon={<Phone className="size-4" />} label="Phone" value={lead.phone} />
          <InfoRow icon={<Building2 className="size-4" />} label="Company" value={lead.company} />
          <InfoRow icon={<Calendar className="size-4" />} label="Source" value={lead.source} capitalize />
          <InfoRow icon={<DollarSign className="size-4" />} label="Deal value" value={lead.value > 0 ? `$${Number(lead.value).toLocaleString()}` : null} />
          {lead.scheduled_date && (
            <div className="col-span-full">
              <InfoRow
                icon={<CalendarDays className="size-4" />}
                label="Scheduled"
                value={format(parseISO(lead.scheduled_date), 'MMM d, yyyy')}
              />
            </div>
          )}
          {lead.tags && lead.tags.length > 0 && (
            <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="size-4 shrink-0" />
              <span className="flex flex-wrap gap-1">
                {lead.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Editable notes card
// ---------------------------------------------------------------------------

function EditableNotesCard({ lead }: { lead: { id: string; notes: string | null } }) {
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

  function handleSave() {
    updateLead.mutate({ id: lead.id, notes: notes || undefined })
    setEditing(false)
  }

  function handleCancel() {
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

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function InfoRow({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn('text-right text-sm font-medium truncate max-w-[60%]', capitalize && 'capitalize')}>
        {value || '—'}
      </span>
    </div>
  )
}

function InlineField({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

function LeadStatusDropdown({
  leadId,
}: {
  leadId: string
}) {
  const updateLead = useUpdateLead()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Change status
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {LEAD_STATUSES.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => updateLead.mutate({ id: leadId, status: opt.value })}
          >
            <LeadStatusBadge status={opt.value} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NewReminderForm({ leadId }: { leadId: string }) {
  const createReminder = useCreateReminder()
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')

  function handleSubmit(e: React.FormEvent) {
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

function ReminderItem({
  reminder,
}: {
  reminder: {
    id: string
    title: string
    due_at: string
    status: string
    description: string | null
  }
}) {
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
