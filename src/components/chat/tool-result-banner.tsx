import { Bell, Check, UserPlus, X, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SendMessageResult } from '@/hooks/use-chat'

const TOOL_META: Record<
  string,
  { icon: typeof UserPlus; label: string; color: string }
> = {
  createLead: { icon: UserPlus, label: 'Lead created', color: 'emerald' },
  createReminder: { icon: Bell, label: 'Reminder set', color: 'blue' },
}

/**
 * Shows results of tool calls made by the agent.
 * Unlike the old ActionCard, tools execute immediately (native tool calling)
 * — this banner just confirms what happened and lets the user dismiss it.
 */
export function ToolResultBanner({
  results,
  onDismiss,
}: {
  results: SendMessageResult['toolCalls']
  onDismiss: () => void
}) {
  return (
    <div className="space-y-2">
      {results.map((tc, i) => {
        const meta = TOOL_META[tc.name] ?? {
          icon: Check,
          label: tc.name,
          color: 'gray',
        }
        const Icon = meta.icon
        const isSuccess = tc.success

        return (
          <div
            key={i}
            className={cn(
              'animate-message-in flex items-center justify-between gap-2 rounded-lg border p-3',
              isSuccess
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-red-500/30 bg-red-500/5',
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  isSuccess ? 'bg-emerald-500/10' : 'bg-red-500/10',
                )}
              >
                {isSuccess ? (
                  <Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isSuccess ? meta.label : 'Action failed'}
                </p>
                <p className="text-xs text-muted-foreground">{tc.message}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={onDismiss}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
