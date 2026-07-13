/**
 * Unified floating chat composer.
 *
 * Shared by both the CRM agent chat and the Studio chat. A single rounded,
 * glass-surfaced container that floats above the message list with margin and
 * shadow — the modern conversational input style.
 *
 * Features:
 *  - Image / PDF / text attachment with extension fallback (macOS reports
 *    empty `file.type` for PDFs; see `src/lib/file-kind.ts`).
 *  - Attachment preview chip inside the container (image thumbnail or file icon).
 *  - Paperclip button (ghost) on the left, circular send button on the right.
 *  - Daily quota pill + locked-state upgrade modal (unchanged behaviour).
 *
 * The server re-validates every upload with magic-byte sniffing
 * (`validateUpload`), so the client-side kind check is UX only.
 */
import { useRef, useEffect, useState } from 'react'
import {
  Send,
  Square,
  Paperclip,
  X,
  ImageIcon,
  FileText,
  Zap,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import { usePlan } from '@/hooks/use-plan'
import { useDropzone, usePasteFiles } from '@/hooks/use-dropzone'
import { getAcceptedFileKind, mimeFromKind } from '@/lib/file-kind'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { cn } from '@/lib/utils'

export interface PendingAttachment {
  fileName: string
  mimeType: string
  /** Object URL for local preview. */
  previewUrl: string
  /** Base64 of the file, sent to the server on submit. */
  base64: string
}

export interface ChatComposerProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isStreaming: boolean
  onStop: () => void
  /** Parent loading (conversation creating, messages loading). */
  disabled?: boolean
  pendingAttachment: PendingAttachment | null
  onAttachmentChange: (att: PendingAttachment | null) => void
  placeholder?: string
}

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Mirrors the server's QUOTA_TIMEZONE (Asia/Kuala_Lumpur). */
const RESET_LABEL = 'midnight (MYT)'

export const ChatComposer = ({
  input,
  onInputChange,
  onSubmit,
  isStreaming,
  onStop,
  disabled,
  pendingAttachment,
  onAttachmentChange,
  placeholder = 'Type a message…',
}: ChatComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  // Quota state — same cached plan-state query both chats already use.
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
      console.log('[chat-debug] Enter pressed', {
        hasInput: !!input.trim(),
        hasAttachment: !!pendingAttachment,
        isStreaming,
        disabled,
        isLocked,
      })
      if (
        (input.trim() || pendingAttachment) &&
        !isStreaming &&
        !disabled &&
        !isLocked
      ) {
        console.log('[chat-debug] → calling onSubmit')
        onSubmit(e as unknown as React.FormEvent)
      } else {
        console.log('[chat-debug] ✋ Enter blocked by guard')
      }
    }
  }

  const handleFile = (file: File) => {
    setError(null)
    // Extension-fallback detection: macOS reports empty file.type for PDFs.
    const kind = getAcceptedFileKind(file)
    console.log('[chat-debug] handleFile', {
      name: file.name,
      type: file.type || '(empty)',
      size: file.size,
      kind,
    })
    if (!kind) {
      console.log('[chat-debug] ✋ file rejected: unsupported kind')
      setError('Only images, PDFs, and text files are supported.')
      return
    }
    if (file.size > MAX_BYTES) {
      console.log('[chat-debug] ✋ file rejected: too large')
      setError('File must be under 10 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        console.log('[chat-debug] ✋ FileReader result not string')
        return
      }
      const base64 = result.split(',')[1] ?? ''
      const mimeType = file.type || mimeFromKind(kind, file.name)
      console.log('[chat-debug] ✓ file read OK', {
        fileName: file.name,
        mimeType,
        base64Length: base64.length,
      })
      onAttachmentChange({
        fileName: file.name,
        // Prefer the browser MIME; fall back to a kind-based MIME when empty.
        mimeType,
        previewUrl: URL.createObjectURL(file),
        base64,
      })
    }
    reader.onerror = () => {
      console.log('[chat-debug] ✋ FileReader error', reader.error)
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

  // Drag-and-drop + paste — route through the same handleFile as the picker
  // button so validation/accept logic stays in one place.
  const canAcceptFiles = !isStreaming && !disabled && !isLocked
  const { isDragging, bind: dropzoneBind } = useDropzone(handleFile, {
    enabled: canAcceptFiles,
  })
  const handlePaste = usePasteFiles(handleFile, { enabled: canAcceptFiles })

  return (
    <div className="relative px-3 pb-3" {...dropzoneBind}>
      {/* Drag overlay — full-coverage drop zone hint. */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <FileText className="size-10" />
            <p className="text-sm font-semibold">Drop to attach</p>
            <p className="text-xs text-muted-foreground">
              Images, PDFs &amp; text files
            </p>
          </div>
        </div>
      )}

      {/* Floating container — rounded glass surface with shadow + breathing room. */}
      <div className="rounded-2xl border bg-card/80 shadow-lg shadow-black/5 backdrop-blur-xl transition-colors focus-within:border-primary/40">
        {/* Attachment preview chip (inside container, above textarea) */}
        {pendingAttachment && (
          <div className="flex flex-wrap gap-2 px-3 pt-2.5">
            <div className="inline-flex items-center gap-2 rounded-lg border bg-muted/50 py-1 pl-1 pr-2">
              {pendingAttachment.mimeType.startsWith('image/') ? (
                <img
                  src={pendingAttachment.previewUrl}
                  alt="attachment"
                  className="size-8 rounded object-cover"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded bg-muted">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
              )}
              <span className="max-w-[160px] truncate text-xs font-medium">
                {pendingAttachment.fileName}
              </span>
              <button
                type="button"
                onClick={clearAttachment}
                className="rounded p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {error && <p className="px-3 pt-2.5 text-xs text-destructive">{error}</p>}

        <form
          onSubmit={(e) => {
            if (isLocked) {
              e.preventDefault()
              setUpgradeOpen(true)
              return
            }
            onSubmit(e)
          }}
          className="flex items-end gap-1.5 p-2"
        >
          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,text/*,.txt,.csv,.md,.json"
            onChange={onPickFile}
            className="hidden"
          />

          {/* Paperclip — ghost, left side */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming || disabled || isLocked}
            title="Attach an image or document"
          >
            <Paperclip className="size-[18px]" />
          </Button>

          {/* Textarea — no visible border; the container is the surface. */}
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isLocked ? lockedPlaceholder : placeholder}
            disabled={isStreaming || disabled}
            rows={1}
            className={cn(
              'min-h-[40px] resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0',
              'field-sizing-content',
              isLocked && 'text-destructive',
            )}
          />

          {/* Send / stop / upgrade button */}
          {isStreaming ? (
            <Button
              type="button"
              variant="outline"
              onClick={onStop}
              size="icon"
              className="size-9 shrink-0 rounded-full"
            >
              <Square className="size-4" />
            </Button>
          ) : isLocked ? (
            <Button
              type="button"
              onClick={() => setUpgradeOpen(true)}
              size="icon"
              className="size-9 shrink-0 rounded-full"
              title="Daily limit reached — upgrade for more"
            >
              <Zap className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={sendDisabled}
              className="size-9 shrink-0 rounded-full"
            >
              {disabled ? (
                <TypingIndicator className="text-primary-foreground" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          )}
        </form>

        {/* Status row: quota pill (left) + hint (right). Hidden entirely when
            locked — the inline banner below takes over. */}
        {!isLocked && (
          <div className="flex items-center justify-between px-3 pb-2 pt-0.5 text-[11px]">
            {!isUnlimited ? (
              <div
                aria-live="polite"
                className={cn(
                  'flex items-center gap-1.5 font-medium tabular-nums',
                  pillTone === 'ok' && 'text-muted-foreground',
                  pillTone === 'warn' && 'text-amber-600 dark:text-amber-400',
                  pillTone === 'out' && 'text-destructive',
                )}
                title={`${messagesRemaining} of ${maxMessages} messages left today`}
              >
                <span
                  className={cn(
                    'inline-block size-1.5 rounded-full',
                    pillTone === 'ok' && 'bg-emerald-500',
                    pillTone === 'warn' && 'bg-amber-500',
                    pillTone === 'out' && 'bg-destructive',
                  )}
                />
                {`${messagesRemaining} / ${maxMessages} today`}
              </div>
            ) : (
              <span />
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <ImageIcon className="size-3" />
              Images, PDFs & text supported
            </span>
          </div>
        )}
      </div>

      {/* Locked-state inline prompt (outside the floating container). */}
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
