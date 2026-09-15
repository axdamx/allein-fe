import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  type ConversationRow,
  type MessageRow,
  type SendMessageResult,
} from '@/server/chat'
import type { ChatStreamEvent } from '@/lib/chat-stream'
import { PLAN_CONFIGS } from '@/lib/plans'
import { showUsageWarning } from '@/lib/usage-warnings'
import type { PlanState } from '@/server/profile'

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const useConversations = (agentId?: string) => {
  return useQuery({
    queryKey: ['chat', 'conversations', agentId],
    queryFn: () => getConversations({ data: { agentId } }),
    staleTime: 15 * 1000,
  })
}

export const useCreateConversation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { agentId: string; title?: string }) =>
      createConversation({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })
}

export const useDeleteConversation = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) =>
      deleteConversation({ data: { conversationId } }),
    onSuccess: (result, conversationId) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.removeQueries({ queryKey: ['chat', 'messages', conversationId] })
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => getMessages({ data: { conversationId: conversationId! } }),
    enabled: !!conversationId,
    staleTime: 0,
    placeholderData: conversationId ? undefined : [],
  })
}

// ---------------------------------------------------------------------------
// Streaming — the core chat hook
// ---------------------------------------------------------------------------

interface StreamState {
  isStreaming: boolean
  streamingText: string
  error: string | null
  /** Tool calls made by the agent (e.g. created a lead). */
  toolCallResults: SendMessageResult['toolCalls']
}

const TEMP_ID_PREFIX = 'temp-'

async function* readChatEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as ChatStreamEvent
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) yield JSON.parse(buffer) as ChatStreamEvent
}

/**
 * Sends a message with optimistic updates + real provider token streaming.
 * Tool call results (e.g. "Lead created") are surfaced as toasts and
 * trigger query invalidation so new leads/reminders show up instantly.
 */
export const useChatStream = (conversationId: string | null) => {
  const qc = useQueryClient()
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    streamingText: '',
    error: null,
    toolCallResults: [],
  })
  const abortRef = useRef<AbortController | null>(null)
  const activeConversationRef = useRef<string | null>(null)

  const send = useCallback(
    async (
      content: string,
      optionsOrId?: string | {
        overrideConvoId?: string
        attachmentUrl?: string | null
        attachmentMime?: string | null
        attachmentFileName?: string | null
      },
    ) => {
      // Backwards-compatible: the second arg used to be a bare conversation id.
      const opts =
        typeof optionsOrId === 'string'
          ? { overrideConvoId: optionsOrId }
          : (optionsOrId ?? {})
      const id = opts.overrideConvoId ?? conversationId
      const attachmentUrl = opts.attachmentUrl ?? null
      const attachmentMime = opts.attachmentMime ?? null
      const attachmentFileName = opts.attachmentFileName ?? null
      if (!id || (!content.trim() && !attachmentUrl)) return
      if (abortRef.current) return

      // Optimistic: show user message immediately
      const optimisticMessage: MessageRow = {
        id: `${TEMP_ID_PREFIX}${Date.now()}`,
        conversation_id: id,
        role: 'user',
        content,
        attachment_url: attachmentUrl,
        attachment_mime: attachmentMime,
        attachment_name: attachmentFileName,
        tokens_in: null,
        tokens_out: null,
        model: null,
        created_at: new Date().toISOString(),
      }

      qc.setQueryData<MessageRow[]>(
        ['chat', 'messages', id],
        (old) => [...(old ?? []), optimisticMessage],
      )

      const controller = new AbortController()
      abortRef.current = controller
      activeConversationRef.current = id
      setState({
        isStreaming: true,
        streamingText: '',
        error: null,
        toolCallResults: [],
      })

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            Accept: 'application/x-ndjson',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: id,
            content,
            attachmentUrl,
            attachmentMime,
            attachmentFileName,
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error(
            response.status === 400
              ? 'Invalid chat request'
              : 'The assistant is unavailable. Please try again.',
          )
        }

        let streamedText = ''
        let completed: Extract<ChatStreamEvent, { type: 'done' }> | null = null
        let streamError: Extract<ChatStreamEvent, { type: 'error' }> | null = null

        for await (const event of readChatEvents(response.body)) {
          if (event.type === 'text') {
            streamedText += event.delta
            setState({
              isStreaming: true,
              streamingText: streamedText,
              error: null,
              toolCallResults: [],
            })
          } else if (event.type === 'done') {
            completed = event
          } else {
            streamError = event
            break
          }
        }

        if (streamError?.code === 'daily_message_limit_reached') {
          const reset = new Date(streamError.resetAt ?? Date.now())
          const resetLabel = reset.toLocaleString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          toast.error(
            `Daily message limit reached (${streamError.max ?? '—'}). Resets at ${resetLabel}.`,
          )
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['chat', 'messages', id] }),
            qc.invalidateQueries({ queryKey: ['plan-state'] }),
          ])
          setState((s) => ({ ...s, isStreaming: false, error: null }))
          return
        }

        if (streamError) throw new Error(streamError.message)
        if (!completed) throw new Error('The chat stream ended unexpectedly.')

        // Handle tool calls — show toast + invalidate queries
        if (completed.toolCalls.length > 0) {
          for (const tc of completed.toolCalls) {
            if (tc.success) {
              toast.success(tc.message)

              // Invalidate relevant queries
              if (tc.name === 'createLead') {
                qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
                qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
              }
              if (tc.name === 'createReminder') {
                qc.invalidateQueries({ queryKey: ['crm', 'reminders'] })
              }
            } else {
              toast.error(tc.message)
            }
          }
        }

        // The server persists the completed answer before sending "done".
        // Keep the streamed bubble visible until the canonical row is loaded,
        // avoiding a flash where the answer briefly disappears.
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['chat', 'messages', id] }),
          qc.invalidateQueries({ queryKey: ['chat', 'conversations'] }),
          qc.invalidateQueries({ queryKey: ['plan-state'] }),
        ])

        setState({
          isStreaming: false,
          streamingText: '',
          error: null,
          toolCallResults: completed.toolCalls,
        })

        // Warn if nearing message limit (reads cached plan state — no extra fetch)
        const ps = qc.getQueryData<PlanState>(['plan-state'])
        if (ps) {
          const max = PLAN_CONFIGS[ps.tier]?.limits?.messages?.max
          if (max) {
            const used = ps.usage?.messages ?? 0
            showUsageWarning({
              metric: 'messages',
              percentUsed: Math.min(100, Math.round((used / max) * 100)),
              remaining: ps.remaining?.messages ?? max,
              tier: ps.tier,
            })
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          await qc.invalidateQueries({ queryKey: ['chat', 'messages', id] })
          return
        }
        const message = err instanceof Error ? err.message : 'Failed to send'
        await qc.invalidateQueries({ queryKey: ['chat', 'messages', id] })
        setState({
          isStreaming: false,
          streamingText: '',
          error: message,
          toolCallResults: [],
        })
        toast.error(message)
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        if (activeConversationRef.current === id) {
          activeConversationRef.current = null
        }
      }
    },
    [conversationId, qc],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    const activeConversation = activeConversationRef.current
    activeConversationRef.current = null
    if (activeConversation) {
      void qc.invalidateQueries({
        queryKey: ['chat', 'messages', activeConversation],
      })
    }
    setState({
      isStreaming: false,
      streamingText: '',
      error: null,
      toolCallResults: [],
    })
  }, [qc])

  const dismissToolResults = useCallback(() => {
    setState((s) => ({ ...s, toolCallResults: [] }))
  }, [])

  return { ...state, send, stop, dismissToolResults }
}

export type { ConversationRow, MessageRow, SendMessageResult }
