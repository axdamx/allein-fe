import { Bot, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const EmptyAgents = ({ onCreate }: { onCreate: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Bot className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No agents yet</p>
        <p className="text-xs text-muted-foreground">
          Create your first AI agent to get started.
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus className="size-4" /> Create agent
      </Button>
    </div>
  )
}
