import { ArrowLeft, DollarSign, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeads, useReminders, useDeals } from '@/hooks/use-crm'
import { EditableContactCard } from '@/components/crm/lead-editable-contact-card'
import { EditableNotesCard } from '@/components/crm/lead-editable-notes-card'
import { CardSlot } from '@/components/crm/lead-card-slot'
import { RemindersCard } from '@/components/crm/lead-reminders-card'
import { LeadStatusDropdown } from '@/components/crm/lead-status-dropdown'
import { formatCurrency } from '@/components/dashboard/dashboard-utils'

const LeadDetailPage = () => {
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
      <div className="mb-6 rounded-[24px] border border-black/[0.05] bg-white/45 p-4 dark:border-white/10 dark:bg-white/[0.025] sm:p-5">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/crm/leads">
            <ArrowLeft className="size-4" /> Back to leads
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="truncate text-2xl font-semibold tracking-[-0.035em]">
                {lead.name}
              </h2>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Added {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              {lead.last_contacted_at && (
                <> &middot; Last contacted {formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" data-tour="lead-message">
              <Link to="/chat">
                <MessageSquare className="size-4" /> Message
              </Link>
            </Button>
            <LeadStatusDropdown leadId={lead.id} />
          </div>
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
                        {formatCurrency(Number(deal.value))}
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

export const Route = createFileRoute('/_authed/crm/leads/$leadId')({
  component: LeadDetailPage,
})
