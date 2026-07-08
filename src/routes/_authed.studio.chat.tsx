import { useState, useRef, useEffect } from 'react'
import { MessageSquarePlus, Trash2, Sparkles, ImageIcon } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import {
  StudioMessageBubble,
  StudioStreamingBubble,
} from '@/components/studio/studio-message-bubble'
import {
  StudioChatInput,
  type PendingAttachment,
} from '@/components/studio/studio-chat-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { motion, staggerContainer, staggerItem } from '@/lib/animations'
import {
  useStudioChats,
  useCreateStudioChat,
  useDeleteStudioChat,
  useStudioMessages,
  useStudioChatStream,
  useUploadStudioAttachment,
} from '@/hooks/use-studio-chat'

/** One-click starter prompts shown in the empty state. */
const STARTER_PROMPTS = [
  'A watercolor of a cozy coffee shop on a rainy morning',
  'A sleek product shot of a smartwatch on marble, soft shadows',
  'Cyberpunk city street at night, neon reflections, cinematic',
  'A flat-lay of tropical fruits, top-down, bright natural light',
]

/**
 * Studio → Chat tab.
 *
 * Two-pane layout:
 *   left  → conversation list (collapsible on mobile)
 *   right → chat thread on top, "canvas" rail on the right showing the most
 *           recent generated asset at a larger size for review / download.
 *
 * Composer supports image uploads (for remix / analyze flow).
 */
const StudioChatPage = () => {
  const { data: chats, isLoading: chatsLoading } = useStudioChats()
  const createChat = useCreateStudioChat()
  const deleteChat = useDeleteStudioChat()

  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null)

  const { data: messages, isLoading: messagesLoading } =
    useStudioMessages(activeChatId)
  const { send, isStreaming, streamingText, stop } =
    useStudioChatStream(activeChatId)
  const uploadAttachment = useUploadStudioAttachment()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Auto-select first chat once loaded.
  useEffect(() => {
    if (!activeChatId && chats && chats.length > 0) {
      setActiveChatId(chats[0].id)
    }
  }, [chats, activeChatId])

  const handleNewChat = () => {
    createChat.mutate(
      { title: 'New studio chat' },
      {
        onSuccess: (result) => {
          if (result && 'id' in result) setActiveChatId(result.id)
        },
      },
    )
  }

  /** Create a fresh chat and immediately send the given prompt. */
  const handleStartWithPrompt = async (prompt: string) => {
    const result = await createChat.mutateAsync({ title: 'New studio chat' })
    if (!result || !('id' in result)) return
    const newId = result.id
    setActiveChatId(newId)
    setInput('')
    // Pass overrideChatId so send works on the first tick before state updates.
    send(prompt, { overrideChatId: newId })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !pendingAttachment) || isStreaming) return
    if (!activeChatId) return

    let attachmentUrl: string | null = null
    if (pendingAttachment) {
      const up = await uploadAttachment.mutateAsync({
        fileName: pendingAttachment.fileName,
        mimeType: pendingAttachment.mimeType,
        base64: pendingAttachment.base64,
      })
      if (up && 'url' in up) {
        attachmentUrl = up.url
        // Replace the local preview URL with the persisted one for the optimistic row.
        URL.revokeObjectURL(pendingAttachment.previewUrl)
      } else {
        // Upload failed — abort send.
        return
      }
    }

    const content = input
    setInput('')

    // Optimistic user message including attachment preview (persisted URL).
    await send(content, {
      attachmentUrl,
      pendingAttachmentMsg: {
        id: `studio-temp-${Date.now()}`,
        chat_id: activeChatId,
        role: 'user',
        content,
        attachment_url: attachmentUrl ?? pendingAttachment?.previewUrl ?? null,
        asset_id: null,
        tool_calls: [],
        model: null,
        tokens_in: null,
        tokens_out: null,
        created_at: new Date().toISOString(),
      },
    })

    setPendingAttachment(null)
  }

  // Canvas: most recent assistant message with media, or last streaming result.
  const canvasMedia =
    [...(messages ?? [])].reverse().find(
      (m) => m.role === 'assistant' && m.attachment_url,
    )?.attachment_url ?? null

  return (
    <div className="grid h-[calc(100vh-14rem)] grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_320px]">
      {/* Conversation list */}
      <Card className="hidden flex-col overflow-hidden lg:flex">
        <div className="border-b p-3">
          <Button
            className="w-full"
            size="sm"
            onClick={handleNewChat}
            disabled={createChat.isPending}
          >
            <MessageSquarePlus className="size-4" /> New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chatsLoading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : chats && chats.length > 0 ? (
            <ul className="space-y-1">
              {chats.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveChatId(c.id)}
                    className={cn(
                      'group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                      activeChatId === c.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteChat.mutate(c.id)
                        if (activeChatId === c.id) setActiveChatId(null)
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
              No chats yet.
              <br />
              Click "New chat" to begin.
            </div>
          )}
        </div>
      </Card>

      {/* Chat thread */}
      <Card className="flex flex-col overflow-hidden">
        {activeChatId ? (
          <>
            <div className="chat-scroll flex-1 space-y-1 overflow-y-auto">
              {messagesLoading ? (
                <div className="space-y-4 p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-3/4" />
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {messages?.map((msg) => (
                    <motion.div key={msg.id} variants={staggerItem}>
                      <StudioMessageBubble message={msg} />
                    </motion.div>
                  ))}
                  {isStreaming && (
                    <motion.div variants={staggerItem}>
                      <StudioStreamingBubble text={streamingText} />
                    </motion.div>
                  )}
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <StudioChatInput
              input={input}
              onInputChange={setInput}
              onSubmit={handleSubmit}
              isStreaming={isStreaming}
              onStop={stop}
              disabled={messagesLoading || !activeChatId}
              pendingAttachment={pendingAttachment}
              onAttachmentChange={setPendingAttachment}
            />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Conversational Studio</p>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Chat with the Studio agent to generate images and video.
                Describe what you want, attach an image to remix, or start from
                a prompt below.
              </p>
            </div>

            {/* Starter prompts */}
            <div className="grid w-full max-w-md grid-cols-1 gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleStartWithPrompt(prompt)}
                  disabled={createChat.isPending}
                  className="group flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <Sparkles className="size-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                  <span className="flex-1">{prompt}</span>
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={handleNewChat}
              disabled={createChat.isPending}
            >
              <MessageSquarePlus className="size-4" /> Start blank chat
            </Button>
          </div>
        )}
      </Card>

      {/* Canvas — latest generated asset */}
      <Card className="hidden flex-col overflow-hidden lg:flex">
        <div className="border-b px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ImageIcon className="size-4" />
            Canvas
          </p>
          <p className="text-xs text-muted-foreground">Latest generated media</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {canvasMedia ? (
            canvasMedia.match(/\.(mp4|webm|mov)(\?|$)/i) ? (
              <video
                src={canvasMedia}
                controls
                className="w-full rounded-lg border"
              />
            ) : (
              <img
                src={canvasMedia}
                alt="Latest generation"
                className="w-full rounded-lg border"
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <ImageIcon className="size-8 opacity-30" />
              <p>Generated images & videos will appear here at a larger size.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/_authed/studio/chat')({
  component: StudioChatPage,
})
