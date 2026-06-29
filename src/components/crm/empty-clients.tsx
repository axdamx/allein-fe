import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const EmptyClients = ({ onCreate }: { onCreate: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Users className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No clients yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first client to start managing your customer database.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" /> Add client
      </Button>
    </div>
  )
}
