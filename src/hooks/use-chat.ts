import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessage,
  type ConversationRow,
  type MessageRow,
  type SendMessageResult,
} from '@/server/chat'
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

/**
 * Sends a message with optimistic updates + progressive text reveal.
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
  const abortRef = useRef(false)

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
      console.log('[chat-debug] CRM send() entered', { id, hasContent: !!content.trim(), hasAttachment: !!attachmentUrl })
      if (!id || (!content.trim() && !attachmentUrl)) {
        console.log('[chat-debug] ✋ CRM send() early-return (guard)')
        return
      }
      if (state.isStreaming) {
        console.log('[chat-debug] ✋ CRM send() early-return (streaming)')
        return
      }

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

      abortRef.current = false
      setState({
        isStreaming: true,
        streamingText: '',
        error: null,
        toolCallResults: [],
      })

      try {
        const result = (await sendMessage({
          data: {
            conversationId: id,
            content,
            attachmentUrl,
            attachmentMime,
            attachmentFileName,
          },
        })) as
          | SendMessageResult
          | { error: 'daily_message_limit_reached'; remaining: number; max: number | null; resetAt: string }
          | { error: string }

        const isLimit = (
          r: typeof result,
        ): r is { error: 'daily_message_limit_reached'; remaining: number; max: number | null; resetAt: string } =>
          'error' in r &&
          typeof (r as { remaining?: unknown }).remaining === 'number'

        if (isLimit(result)) {
          const reset = new Date(result.resetAt)
          const resetLabel = reset.toLocaleString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          toast.error(
            `Daily message limit reached (${result.max ?? '—'}). Resets at ${resetLabel}.`,
          )
          qc.invalidateQueries({ queryKey: ['plan-state'] })
          setState((s) => ({ ...s, isStreaming: false, error: null }))
          return
        }

        if ('error' in result) {
          throw new Error(result.error)
        }

        // Reveal reply progressively for typing UX
        const fullText = result.reply
        const chunkSize = Math.max(1, Math.ceil(fullText.length / 80))
        for (let i = 0; i < fullText.length; i += chunkSize) {
          if (abortRef.current) break
          setState({
            isStreaming: true,
            streamingText: fullText.slice(0, i + chunkSize),
            error: null,
            toolCallResults: [],
          })
          await new Promise((r) => setTimeout(r, 12))
        }

        // Handle tool calls — show toast + invalidate queries
        if (result.toolCalls.length > 0) {
          for (const tc of result.toolCalls) {
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

        setState({
          isStreaming: false,
          streamingText: '',
          error: null,
          toolCallResults: result.toolCalls,
        })

        // Refresh persisted messages
        qc.invalidateQueries({
          queryKey: ['chat', 'messages', conversationId],
        })
        qc.invalidateQueries({ queryKey: ['chat', 'conversations'] })
        qc.invalidateQueries({ queryKey: ['plan-state'] })

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
        const message = err instanceof Error ? err.message : 'Failed to send'
        setState({
          isStreaming: false,
          streamingText: '',
          error: message,
          toolCallResults: [],
        })
        toast.error(message)
      }
    },
    [conversationId, state.isStreaming, qc],
  )

  const stop = useCallback(() => {
    abortRef.current = true
    setState({
      isStreaming: false,
      streamingText: '',
      error: null,
      toolCallResults: [],
    })
  }, [])

  const dismissToolResults = useCallback(() => {
    setState((s) => ({ ...s, toolCallResults: [] }))
  }, [])

  return { ...state, send, stop, dismissToolResults }
}

export type { ConversationRow, MessageRow, SendMessageResult }
