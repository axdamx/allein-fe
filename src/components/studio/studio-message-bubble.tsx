/**
 * Studio-flavoured message bubble.
 *
 * Differs from the CRM MessageBubble in two ways:
 *  - Renders an image attachment on user messages (uploaded reference image)
 *  - Renders an inline media result (image/video URL) on assistant messages
 *    when the agent called generate_image / generate_video
 * Markdown rendering is reused via the same libraries.
 */
import { Check, Copy, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { formatTime } from '@/components/chat/chat-utils'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import type { StudioMessageRow } from '@/hooks/use-studio-chat'

const isVideoUrl = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

export const StudioMessageBubble = ({ message }: { message: StudioMessageRow }) => {
  const isUser = message.role === 'user'
  const mediaUrl = message.attachment_url

  return (
    <div
      className={cn(
        'flex gap-3 m-5',
        isUser
          ? 'flex-row-reverse animate-message-in-right'
          : 'flex-row animate-message-in-left',
      )}
    >
      <Avatar className="mt-1 size-8 shrink-0">
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
          'flex min-w-0 flex-col gap-1',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {/* Attachment / generated media preview */}
        {mediaUrl && (
          <div className="max-w-[85%] overflow-hidden rounded-2xl border">
            {isVideoUrl(mediaUrl) ? (
              <video src={mediaUrl} controls className="max-h-80 w-full object-cover" />
            ) : (
              <img
                src={mediaUrl}
                alt="attachment"
                className="max-h-80 w-full object-cover"
              />
            )}
          </div>
        )}

        {(message.content || !mediaUrl) && (
          <div
            className={cn(
              'max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground',
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        <span className="px-1 text-[10px] text-muted-foreground/60">
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}

export const StudioStreamingBubble = ({ text }: { text: string }) => {
  return (
    <div className="m-5 flex gap-3">
      <Avatar className="mt-1 size-8 shrink-0">
        <AvatarFallback className="size-8 bg-muted">
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="w-fit max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed">
          {text ? (
            <span className="streaming-cursor whitespace-pre-wrap break-words">
              {text}
            </span>
          ) : (
            <TypingIndicator className="text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
  )
}

// Re-export for callers wanting the markdown copy helper.
export { Check, Copy }
