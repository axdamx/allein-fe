import { ChevronDown } from 'lucide-react'
import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateLead } from '@/hooks/use-crm'
import { LEAD_STATUSES } from '@/server/crm'
import type { LeadRow } from '@/server/crm'

const STATUS_OPTIONS = LEAD_STATUSES

export const StatusCell = ({ lead }: { lead: LeadRow }) => {
  const updateLead = useUpdateLead()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex">
          <LeadStatusBadge status={lead.status} />
          <ChevronDown className="ml-1 size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => updateLead.mutate({ id: lead.id, status: opt.value })}
          >
            <LeadStatusBadge status={opt.value} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
