import { Bot, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/hooks/use-chat'

export function MessageBubble({ message }: { message: MessageRow }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse animate-message-in-right' : 'animate-message-in-left',
      )}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarFallback
          className={cn(
            'size-8 text-xs',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  )
}

/** Inline streaming bubble with typing animation. */
export function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3 animate-message-in-left">
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="size-8 bg-muted">
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[75%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
        {text ? (
          <p className="streaming-cursor whitespace-pre-wrap break-words">
            {text}
          </p>
        ) : (
          <span className="inline-flex gap-1">
            <span className="size-2 animate-pulse rounded-full bg-muted-foreground/50" />
            <span
              className="size-2 animate-pulse rounded-full bg-muted-foreground/50"
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className="size-2 animate-pulse rounded-full bg-muted-foreground/50"
              style={{ animationDelay: '0.4s' }}
            />
          </span>
        )}
      </div>
    </div>
  )
}
