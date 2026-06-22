import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  useAgentTypes,
  type AgentTypeRow,
} from '@/hooks/use-agents'
import { getLucideIcon } from '@/lib/icons'
import { updateUserAgentType } from '@/server/settings'
import type { AgentTypeKey } from '@/lib/agent-types'

function Icon({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: React.CSSProperties
}) {
  const Cmp = getLucideIcon(name)
  return <Cmp className={className} style={style} />
}

export function OnboardingModal() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: agentTypes, isLoading } = useAgentTypes()
  const [selectedType, setSelectedType] = useState<AgentTypeRow | null>(null)

  const mutation = useMutation({
    mutationFn: (agentType: AgentTypeKey) =>
      updateUserAgentType({ data: { agentType } }),
    onSuccess: async (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Welcome to Allein!')
      await router.invalidate()
      queryClient.clear()
      router.navigate({ to: '/dashboard' })
    },
  })

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-2xl">Welcome to Allein</DialogTitle>
          <DialogDescription className="text-base">
            What do you do? Choose your profession to get started with the right AI agent.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {agentTypes?.map((type) => {
              const isSelected = selectedType?.key === type.key
              return (
                <button
                  key={type.key}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
                    isSelected
                      ? 'border-foreground ring-1 ring-foreground'
                      : 'hover:border-foreground/30 hover:bg-muted/50',
                  )}
                  style={{ borderColor: isSelected ? undefined : `${type.accent_color}40` }}
                >
                  {isSelected && (
                    <div className="absolute right-2 top-2">
                      <Check className="size-4" />
                    </div>
                  )}
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
              )
            })}
          </div>
        )}

        {selectedType && (
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Preview: system prompt</p>
            <p className="mt-1 line-clamp-3">{selectedType.system_prompt}</p>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          disabled={!selectedType || mutation.isPending}
          onClick={() => {
            if (selectedType) {
              mutation.mutate(selectedType.key as AgentTypeKey)
            }
          }}
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {selectedType
            ? `Continue as ${selectedType.label}`
            : 'Select your profession'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
