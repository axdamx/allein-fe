import { Bot, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const EmptyAgents = ({
  onCreate,
  disabled,
}: {
  onCreate: () => void
  disabled?: boolean
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#171713]/10 py-9 text-center dark:border-white/10">
      <div className="flex size-11 items-center justify-center rounded-xl bg-[#F8D8C8] text-[#A54528]">
        <Bot className="size-4.5" />
      </div>
      <div>
        <p className="text-sm font-medium">No agents yet</p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Give your workspace its first specialist.
        </p>
      </div>
      <Button size="sm" className="rounded-full bg-[#171713] text-white hover:bg-[#2B2B25] dark:bg-[#F1663C]" onClick={onCreate} disabled={disabled}>
        <Plus className="size-4" /> Create agent
      </Button>
    </div>
  )
}
