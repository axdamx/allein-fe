/**
 * Composer for the Studio chat — like the CRM ChatInput but with an image
 * upload button (paperclip) and an inline attachment preview chip.
 *
 * Uploads reuse the same base64-over-server-fn pattern as the knowledge base.
 * The selected file is previewed locally and sent with the next message.
 */
import { useRef, useEffect, useState } from 'react'
import { Send, Square, Loader2, Paperclip, X, ImageIcon, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import { cn } from '@/lib/utils'

interface PendingAttachment {
  fileName: string
  mimeType: string
  /** Object URL for local preview. */
  previewUrl: string
  /** Base64 of the file, sent to the server on submit. */
  base64: string
}

interface Props {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isStreaming: boolean
  onStop: () => void
  disabled?: boolean
  pendingAttachment: PendingAttachment | null
  onAttachmentChange: (att: PendingAttachment | null) => void
  placeholder?: string
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Mirrors the CRM ChatInput's reset label (server uses Asia/Kuala_Lumpur). */
const RESET_LABEL = 'midnight (MYT)'

export const StudioChatInput = ({
  input,
  onInputChange,
  onSubmit,
  isStreaming,
  onStop,
  disabled,
  pendingAttachment,
  onAttachmentChange,
  placeholder = 'Describe an image or video to create…',
}: Props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Quota state — same source as the CRM ChatInput (cached plan-state query).
  const { remaining, usage, config } = usePlan()
  const maxMessages = config.limits.messages.max
  const messagesRemaining = remaining.messages
  const messagesUsed = usage.messages ?? 0
  const isUnlimited = messagesRemaining === null || maxMessages === null
  const isLocked = !isUnlimited && messagesRemaining === 0

  const pctUsed =
    isUnlimited || !maxMessages
      ? 0
      : Math.min(100, Math.round((messagesUsed / maxMessages) * 100))
  const pctRemaining = 100 - pctUsed
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
      if (
        (input.trim() || pendingAttachment) &&
        !isStreaming &&
        !disabled &&
        !isLocked
      ) {
        onSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  const handleFile = (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Only image attachments are supported right now.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') return
      const base64 = result.split(',')[1] ?? ''
      onAttachmentChange({
        fileName: file.name,
        mimeType: file.type,
        previewUrl: URL.createObjectURL(file),
        base64,
      })
    }
    reader.readAsDataURL(file)
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const clearAttachment = () => {
    if (pendingAttachment) URL.revokeObjectURL(pendingAttachment.previewUrl)
    onAttachmentChange(null)
  }

  const sendDisabled =
    (!input.trim() && !pendingAttachment) || isStreaming || disabled

  const lockedPlaceholder = `Daily limit reached (${maxMessages} messages) — resets at ${RESET_LABEL}`

  return (
    <div className="border-t bg-background p-3">
      {/* Attachment preview chip */}
      {pendingAttachment && (
        <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-muted/40 p-1.5 pr-2">
          <img
            src={pendingAttachment.previewUrl}
            alt="attachment"
            className="size-9 rounded object-cover"
          />
          <div className="flex flex-col">
            <span className="max-w-[160px] truncate text-xs font-medium">
              {pendingAttachment.fileName}
            </span>
            <span className="text-[10px] text-muted-foreground">Attached</span>
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            className="ml-1 rounded p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

      <form
        onSubmit={(e) => {
          if (isLocked) {
            e.preventDefault()
            setUpgradeOpen(true)
            return
          }
          onSubmit(e)
        }}
        className="relative flex items-end gap-2"
      >
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={isStreaming || disabled || isLocked}
          title="Attach an image"
        >
          <Paperclip className="size-4" />
        </Button>

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
          <Button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            size="icon"
            className="absolute bottom-2 right-2 size-8 shrink-0"
            title="Daily limit reached — upgrade for more"
          >
            <Zap className="size-3.5" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={sendDisabled}
            className="absolute bottom-2 right-2 size-8 shrink-0"
          >
            {disabled ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        )}
      </form>

      {/* Status row: quota counter (hidden for unlimited tiers) + hint */}
      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px]">
        {!isUnlimited ? (
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
        ) : (
          <span />
        )}
        <span className="flex items-center gap-1 text-muted-foreground">
          <ImageIcon className="size-3" />
          Attach an image to remix, or just describe what you want.
        </span>
      </div>

      {/* Locked-state inline prompt */}
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

export type { PendingAttachment }
