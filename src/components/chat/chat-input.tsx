import { useRef, useEffect } from 'react'
import { Send, Square, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  isStreaming,
  onStop,
  isCreatingConversation,
  disabled,
  placeholder = 'Type your message…',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${ta.scrollHeight}px`
    }
  }, [input])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isStreaming && !disabled) {
        onSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <form onSubmit={onSubmit} className="relative flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming || disabled}
          rows={1}
          className={cn(
            'min-h-[44px] resize-none py-3 pr-12',
            'field-sizing-content',
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
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isCreatingConversation || disabled}
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
    </div>
  )
}
