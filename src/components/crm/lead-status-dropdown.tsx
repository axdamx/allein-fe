import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateLead } from '@/hooks/use-crm'
import { LEAD_STATUSES } from '@/server/crm'

export const LeadStatusDropdown = ({ leadId }: { leadId: string }) => {
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
