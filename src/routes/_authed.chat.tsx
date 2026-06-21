import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  Loader2,
  MessageSquarePlus,
  Send,
  Square,
  Trash2,
} from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { MessageBubble, StreamingBubble } from '@/components/chat/message-bubble'
import { ToolResultBanner } from '@/components/chat/tool-result-banner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgents } from '@/hooks/use-agents'
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
  useChatStream,
} from '@/hooks/use-chat'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/chat')({
  component: ChatPage,
})

function ChatPage() {
  const { user } = Route.useRouteContext()
  const { data: agents } = useAgents()
  const { data: conversations, isLoading: convosLoading } = useConversations()
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()

  const [activeConvoId, setActiveConvoId] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const { data: messages, isLoading: messagesLoading } = useMessages(activeConvoId)
  const { send, isStreaming, streamingText, stop, toolCallResults, dismissToolResults } =
    useChatStream(activeConvoId)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages / streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText, toolCallResults])

  const activeConvo = conversations?.find((c) => c.id === activeConvoId)
  const activeAgent = agents?.find((a) => a.id === activeConvo?.agent_id)
  const defaultAgentId = agents?.[0]?.id

  // Select the most recent conversation on mount if none selected
  useEffect(() => {
    if (!activeConvoId && conversations && conversations.length > 0) {
      setActiveConvoId(conversations[0].id)
    }
  }, [conversations, activeConvoId])

  function handleNewConversation() {
    if (!defaultAgentId) return
    createConversation.mutate(
      { agentId: defaultAgentId },
      {
        onSuccess: (result) => {
          if (!('error' in result)) {
            setActiveConvoId(result.id)
          }
        },
      },
    )
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    let convoId = activeConvoId
    if (!convoId && defaultAgentId) {
      const result = await createConversation.mutateAsync({
        agentId: defaultAgentId,
      })
      if ('error' in result) return
      convoId = result.id
      setActiveConvoId(convoId)
    }

    if (!convoId) return
    const content = input
    setInput('')
    await send(content)
  }

  // Display title: use conversation title, or "New conversation" for brand new
  const headerTitle = activeConvo?.title ?? 'New conversation'

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.email?.split('@')[0]}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {headerTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeAgent
              ? <>Talking with <span className="font-medium text-foreground">{activeAgent.name}</span></>
              : 'Start a conversation with your AI agent'}
          </p>
        </div>
      </div>

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b p-3">
            <Button
              className="w-full"
              size="sm"
              onClick={handleNewConversation}
              disabled={!defaultAgentId || createConversation.isPending}
            >
              <MessageSquarePlus className="size-4" /> New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {convosLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : conversations && conversations.length > 0 ? (
              <ul className="space-y-1">
                {conversations.map((convo) => (
                  <li key={convo.id}>
                    <button
                      onClick={() => setActiveConvoId(convo.id)}
                      className={cn(
                        'group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        activeConvoId === convo.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted',
                      )}
                    >
                      <Bot className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">
                        {convo.title}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation.mutate(convo.id)
                          if (activeConvoId === convo.id) {
                            setActiveConvoId(null)
                          }
                        }}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No conversations yet.
                <br />
                Click "New chat" to start.
              </div>
            )}
          </div>
        </Card>

        {/* Message thread */}
        <Card className="flex flex-col overflow-hidden">
          {activeConvoId ? (
            <>
              {/* Messages */}
              <div className="chat-scroll flex-1 space-y-4 overflow-y-auto p-4">
                {messagesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-3/4" />
                    ))}
                  </div>
                ) : (
                  <>
                    {messages?.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isStreaming && (
                      <StreamingBubble text={streamingText} />
                    )}
                    {/* Tool results appear after streaming completes */}
                    {!isStreaming && toolCallResults.length > 0 && (
                      <ToolResultBanner
                        results={toolCallResults}
                        onDismiss={dismissToolResults}
                      />
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message…"
                    disabled={isStreaming}
                    autoFocus
                  />
                  {isStreaming ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={stop}
                      size="icon"
                    >
                      <Square className="size-4" />
                    </Button>
                  ) : (
                    <Button type="submit" size="icon" disabled={!input.trim()}>
                      {createConversation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  )}
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="flex size-16 animate-message-in items-center justify-center rounded-full bg-muted">
                <Bot className="size-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Start a new conversation</p>
                <p className="text-sm text-muted-foreground">
                  Select a conversation or create a new one to begin chatting.
                </p>
              </div>
              {!defaultAgentId && (
                <Button asChild>
                  <Link to="/agents">Create an agent first</Link>
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
