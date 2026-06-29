import { Calendar, MoreHorizontal } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateLead, useDeleteLead } from '@/hooks/use-crm'
import type { LeadRow } from '@/server/crm'

export const ActionsCell = ({ lead }: { lead: LeadRow }) => {
  const deleteLead = useDeleteLead()
  const updateLead = useUpdateLead()
  const todayStr = new Date().toISOString().split('T')[0]
  const isScheduledToday = lead.scheduled_date === todayStr

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/crm/leads/$leadId" params={{ leadId: lead.id }}>
            View details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            updateLead.mutate({
              id: lead.id,
              scheduled_date: isScheduledToday ? null : todayStr,
            })
          }
        >
          <Calendar className="mr-2 size-3.5" />
          {isScheduledToday ? 'Remove from today' : 'Add to today'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => deleteLead.mutate(lead.id)}
        >
          Delete lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
