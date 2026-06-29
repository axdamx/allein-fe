import { CalendarDays, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { FilterMode } from '@/routes/_authed.crm.leads.index'

export const EmptyLeads = ({ onCreate, filterMode }: { onCreate: () => void; filterMode: FilterMode }) => {
  if (filterMode === 'today') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Nothing scheduled for today</p>
          <p className="text-sm text-muted-foreground">
            Place a lead card in today's slot to see it here.
          </p>
        </div>
        <Button onClick={() => window.location.href = '/crm/leads'} variant="outline" size="sm">
          View all leads
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Users className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No leads yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first prospect or let your agents capture leads for you.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" /> Add lead
      </Button>
    </div>
  )
}
