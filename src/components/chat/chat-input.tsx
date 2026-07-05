import { useRef, useEffect, useState } from 'react'
import { Send, Square, Loader2, Sparkles, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import { cn } from '@/lib/utils'

interface Props {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isStreaming: boolean
  onStop: () => void
  isCreatingConversation: boolean
  disabled?: boolean
  placeholder?: string
}

/**
 * Short label for when the daily quota resets. Mirrors the server's
 * QUOTA_TIMEZONE (Asia/Kuala_Lumpur) — the window rolls over at local
 * midnight, so this is a fixed string. Used only for display.
 */
const RESET_LABEL = 'midnight (MYT)'

export const ChatInput = ({
  input,
  onInputChange,
  onSubmit,
  isStreaming,
  onStop,
  isCreatingConversation,
  disabled,
  placeholder = 'Type your message…',
}: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Quota state comes from the cached plan-state query (TanStack Query).
  // No extra fetch — `remaining`/`usage` are already in memory and stay
  // fresh because use-chat invalidates ['plan-state'] after each send.
  const { remaining, usage, config } = usePlan()
  const maxMessages = config.limits.messages.max
  const messagesRemaining = remaining.messages // null = unlimited
  const messagesUsed = usage.messages ?? 0

  const isUnlimited = messagesRemaining === null || maxMessages === null
  // Percent used only meaningful for capped tiers.
  const pctUsed =
    isUnlimited || !maxMessages
      ? 0
      : Math.min(100, Math.round((messagesUsed / maxMessages) * 100))
  const pctRemaining = 100 - pctUsed

  // Locked = exactly zero left today on a capped tier.
  const isLocked = !isUnlimited && messagesRemaining === 0
  // Effective disabled = parent-disabled (loading) OR locked.
  const sendDisabled = !input.trim() || isCreatingConversation || disabled

  // Pill colour by remaining band.
  const pillTone = isUnlimited
    ? 'unlimited'
    : pctRemaining > 20
      ? 'ok'
      : pctRemaining > 0
        ? 'warn'
        : 'out'

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    }
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Block submit when locked or otherwise disabled.
      if (input.trim() && !isStreaming && !disabled && !isLocked) {
        onSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  const lockedPlaceholder = `Daily limit reached (${maxMessages} messages) — resets at ${RESET_LABEL}`

  return (
    <div className="border-t bg-background p-3">
      <form
        onSubmit={(e) => {
          // Hard block submission at the form level when locked.
          if (isLocked) {
            e.preventDefault()
            setUpgradeOpen(true)
            return
          }
          onSubmit(e)
        }}
        className="relative flex items-end gap-2"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLocked ? lockedPlaceholder : placeholder}
          disabled={isStreaming || disabled}
          rows={1}
          className={cn(
            'min-h-[44px] resize-none py-3 pr-12',
            'field-sizing-content',
            isLocked && 'border-destructive/40 focus-visible:ring-destructive/30',
          )}
        />

        {isStreaming ? (
          <Button
            type="button"
            variant="outline"
            onClick={onStop}
            size="icon"
            className="absolute bottom-2 right-2 size-8 shrink-0"
          >
            <Square className="size-3.5" />
          </Button>
        ) : isLocked ? (
          // Replaced send button: opens the upgrade modal.
          <Button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            size="icon"
            className="absolute bottom-2 right-2 size-8 shrink-0"
            title="Daily limit reached — upgrade for more"
          >
            <Sparkles className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={sendDisabled}
            className="absolute bottom-2 right-2 size-8 shrink-0"
          >
            {isCreatingConversation ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        )}
      </form>

      {/* Status row: quota counter (left) — kept OUT of the textarea so it
          never overlaps the send button or typed text. Hidden for unlimited
          tiers (Pro/Custom). */}
      {!isUnlimited && (
        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px]">
          <div
            aria-live="polite"
            className={cn(
              'flex items-center gap-1.5 font-medium tabular-nums',
              pillTone === 'ok' && 'text-muted-foreground',
              pillTone === 'warn' && 'text-amber-600 dark:text-amber-400',
              pillTone === 'out' && 'text-destructive',
            )}
            title={
              isLocked
                ? `Daily limit reached — resets at ${RESET_LABEL}`
                : `${messagesRemaining} of ${maxMessages} messages left today`
            }
          >
            <span
              className={cn(
                'inline-block size-1.5 rounded-full',
                pillTone === 'ok' && 'bg-emerald-500',
                pillTone === 'warn' && 'bg-amber-500',
                pillTone === 'out' && 'bg-destructive',
              )}
            />
            {isLocked
              ? '0 left today'
              : `${messagesRemaining} / ${maxMessages} today`}
          </div>
        </div>
      )}

      {/* Locked-state inline prompt — full-width, beneath the input. */}
      {isLocked && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span className="flex items-center gap-1.5 font-medium">
            <Zap className="size-3.5" />
            You've used all {maxMessages} messages on the {config.label} plan
            today.
          </span>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-xs"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade
          </Button>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={config.tier}
        reason={
          isLocked
            ? {
                kind: 'limit',
                metric: 'messages',
                used: messagesUsed,
                max: maxMessages,
              }
            : { kind: 'general' }
        }
      />
    </div>
  )
}
