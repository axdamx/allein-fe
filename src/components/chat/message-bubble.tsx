import { useState, useCallback } from 'react'
import { Check, ChevronDown, ChevronRight, Copy, Bot, User, Wrench, Loader2, XCircle, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { MessageRow } from '@/hooks/use-chat'
import type { SendMessageResult } from '@/server/chat'

export function MessageBubble({
  message,
  toolCalls,
}: {
  message: MessageRow
  toolCalls?: SendMessageResult['toolCalls']
}) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Avatar className="mt-1 size-8 shrink-0">
        <AvatarFallback
          className={cn(
            'size-8 text-xs',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted',
          )}
        >
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={cn('flex min-w-0 flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'w-fit max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>
        {!isUser && toolCalls && toolCalls.length > 0 && (
          <div className="w-full max-w-[85%] space-y-1.5">
            {toolCalls.map((tc, i) => (
              <ToolCallCard key={i} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? '')
            const isInline = !match && !className
            if (isInline) {
              return (
                <code
                  className="rounded bg-foreground/10 px-1 py-0.5 text-sm font-medium"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <CodeBlock
                language={match?.[1] ?? 'text'}
                code={String(children).replace(/\n$/, '')}
              />
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [code])

  return (
    <div className="not-prose my-2 overflow-hidden rounded-lg border bg-[#0d1117] text-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-1.5">
        <span className="text-xs text-white/60">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-white/90"
        >
          {copied ? (
            <>
              <Check className="size-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <code className={`language-${language} hljs`}>{code}</code>
      </div>
    </div>
  )
}

function ToolCallCard({
  toolCall,
}: {
  toolCall: SendMessageResult['toolCalls'][number]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
            toolCall.success
              ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10',
          )}
        >
          {toolCall.success ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="size-4 shrink-0 text-red-500" />
          )}
          <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-medium">
            {toolCall.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 text-[10px]',
              toolCall.success
                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 text-red-600 dark:text-red-400',
            )}
          >
            {toolCall.success ? 'Success' : 'Failed'}
          </Badge>
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1">
        <div className="rounded-lg border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          {toolCall.message}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
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
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
