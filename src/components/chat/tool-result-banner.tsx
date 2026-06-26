import { CheckCircle2, XCircle, X, Wrench } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SendMessageResult } from '@/server/chat'

export function ToolResultBanner({
  results,
  onDismiss,
}: {
  results: SendMessageResult['toolCalls']
  onDismiss: () => void
}) {
  return (
    <div className="space-y-2">
      {results.map((tc, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3',
            tc.success
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-red-500/20 bg-red-500/5',
          )}
        >
          {tc.success ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Wrench className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{tc.name}</span>
              <span
                className={cn(
                  'ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium',
                  tc.success
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400',
                )}
              >
                {tc.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tc.message}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={onDismiss}
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
