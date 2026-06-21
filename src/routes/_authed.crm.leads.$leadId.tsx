import { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Calendar,
  Mail,
  Phone,
  Plus,
  Building2,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useLeads, useUpdateLead } from '@/hooks/use-crm'
import {
  useReminders,
  useCreateReminder,
  useUpdateReminderStatus,
} from '@/hooks/use-crm'
import { LEAD_STATUSES } from '@/server/crm'
import type { LeadStatus } from '@/server/crm'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/crm/leads/$leadId')({
  component: LeadDetailPage,
})

function LeadDetailPage() {
  const { leadId } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: leads, isLoading } = useLeads()
  const { data: reminders } = useReminders()

  const lead = leads?.find((l) => l.id === leadId)
  const leadReminders = (reminders ?? []).filter(
    (r) => r.lead_id === leadId,
  )

  if (isLoading) {
    return (
      <DashboardShell userEmail={user?.email}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    )
  }

  if (!lead) {
    return (
      <DashboardShell userEmail={user?.email}>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Lead not found.</p>
            <Button asChild variant="link">
              <Link to="/crm/leads">Back to leads</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.email?.split('@')[0]}
    >
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/crm/leads">
            <ArrowLeft className="size-4" /> Back to leads
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {lead.name}
              </h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </p>
          </div>
          <LeadStatusDropdown leadId={lead.id} current={lead.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Contact info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contact information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={<Mail className="size-4" />}
              label="Email"
              value={lead.email}
            />
            <InfoRow
              icon={<Phone className="size-4" />}
              label="Phone"
              value={lead.phone}
            />
            <InfoRow
              icon={<Building2 className="size-4" />}
              label="Company"
              value={lead.company}
            />
            <InfoRow
              icon={<Calendar className="size-4" />}
              label="Source"
              value={lead.source}
              capitalize
            />
            <InfoRow
              icon={<Calendar className="size-4" />}
              label="Deal value"
              value={
                lead.value > 0 ? `$${Number(lead.value).toLocaleString()}` : null
              }
            />
            {lead.notes && (
              <div className="border-t pt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Notes
                </p>
                <p className="text-sm">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" /> Reminders
            </CardTitle>
            <CardDescription>
              Follow-ups and tasks for this lead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewReminderForm leadId={lead.id} />
            <div className="mt-3 space-y-2">
              {leadReminders.length > 0 ? (
                leadReminders.map((r) => (
                  <ReminderItem key={r.id} reminder={r} />
                ))
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No reminders yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}

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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn('text-sm font-medium', capitalize && 'capitalize')}>
        {value || '—'}
      </span>
    </div>
  )
}

function LeadStatusDropdown({
  leadId,
}: {
  leadId: string
  current: LeadStatus
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
        placeholder="Reminder title…"
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
