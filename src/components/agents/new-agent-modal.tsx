import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  useAgentTypes,
  useCreateAgent,
  type AgentTypeRow,
} from '@/hooks/use-agents'
import { usePlan } from '@/hooks/use-plan'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { getLucideIcon } from '@/lib/icons'

/** Render a lucide icon by its kebab-case name. */
const Icon = ({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: React.CSSProperties
}) => {
  const Cmp = getLucideIcon(name)
  return <Cmp className={className} style={style} />
}

export const NewAgentModal = ({
  open,
  onOpenChange,
  userAgentType,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userAgentType?: string | null
}) => {
  const { data: agentTypes, isLoading: typesLoading } = useAgentTypes()
  const createAgent = useCreateAgent()
  const { canDo, usage, config, tier } = usePlan()

  const [selectedType, setSelectedType] = useState<AgentTypeRow | null>(null)
  const [agentName, setAgentName] = useState('')
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const agentsRemaining = config.limits.agents.max
  const atLimit = !canDo('agents')

  // Filter to the user's allowed agent type, or show all if not set
  const availableTypes =
    userAgentType
      ? agentTypes?.filter((t) => t.key === userAgentType) ?? []
      : agentTypes ?? []

  // Auto-select when there's only one available type
  useEffect(() => {
    if (open && availableTypes.length === 1 && !selectedType) {
      setSelectedType(availableTypes[0])
      setAgentName(`My ${availableTypes[0].label}`)
    }
  }, [open, availableTypes, selectedType])

  const handleClose = () => {
    setSelectedType(null)
    setAgentName('')
    onOpenChange(false)
  }

  const handleSelectType = (type: AgentTypeRow) => {
    if (atLimit) {
      setUpgradeOpen(true)
      return
    }
    setSelectedType(type)
    // Pre-fill name from the type label
    setAgentName(`My ${type.label}`)
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType) return
    createAgent.mutate(
      {
        type: selectedType.key,
        name: agentName.trim() || `My ${selectedType.label}`,
      },
      {
        onSuccess: (result) => {
          if (!('error' in result)) {
            handleClose()
          }
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedType ? 'Configure your agent' : 'Choose an agent type'}
            </DialogTitle>
            <DialogDescription>
              {selectedType
                ? `Set up your ${selectedType.label}.`
                : atLimit
                  ? `You've reached your agent limit (${usage.agents}/${agentsRemaining}). Upgrade to create more.`
                  : 'Pick a template to get started. You can customize it later.'}
            </DialogDescription>
          </DialogHeader>

          {!selectedType ? (
            // ---- Step 1: type picker ----
            typesLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {availableTypes.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => handleSelectType(type)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/50',
                      atLimit && 'opacity-50',
                    )}
                    style={{ borderColor: `${type.accent_color}40` }}
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${type.accent_color}20`,
                      }}
                    >
                      <Icon
                        name={type.icon ?? 'bot'}
                        className="size-5"
                        style={{ color: type.accent_color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            // ---- Step 2: configure ----
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: `${selectedType.accent_color}40` }}>
                <div
                  className="flex size-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${selectedType.accent_color}20` }}
                >
                  <Icon
                    name={selectedType.icon ?? 'bot'}
                    className="size-5"
                    style={{ color: selectedType.accent_color }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{selectedType.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedType.description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedType(null)}
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent name</Label>
                <Input
                  id="agent-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder={`My ${selectedType.label}`}
                  autoFocus
                />
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">System prompt</p>
                <p className="mt-1 line-clamp-3">{selectedType.system_prompt}</p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createAgent.isPending}>
                  {createAgent.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Create agent
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        reason={{
          kind: 'limit',
          metric: 'agents',
          used: usage.agents,
          max: agentsRemaining,
        }}
      />
    </>
  )
}
