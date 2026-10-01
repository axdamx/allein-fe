/**
 * TanStack Query hooks for the Studio chat.
 *
 * Same shape as the CRM chat hooks (`use-chat.ts`) so the UI feels consistent:
 * - progressive text reveal after the (non-streamed) agent.generate() returns
 * - tool-call results surfaced as toasts + canvas updates
 * - shared daily `messages` quota warnings
 */
import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listStudioChats,
  createStudioChat,
  deleteStudioChat,
  getStudioMessages,
  uploadStudioAttachment,
  sendStudioMessage,
  type StudioChatRow,
  type StudioMessageRow,
  type StudioToolCall,
  type SendStudioMessageResult,
} from '@/server/studio-chat'
import { PLAN_CONFIGS } from '@/lib/plans'
import { showUsageWarning } from '@/lib/usage-warnings'
import type { PlanState } from '@/server/profile'
import { patchMessageQuota } from '@/lib/plan-cache'

// ---------------------------------------------------------------------------
// Chats list
// ---------------------------------------------------------------------------

export const useStudioChats = () => {
  return useQuery({
    queryKey: ['studio', 'chats'],
    queryFn: () => listStudioChats(),
    staleTime: 15 * 1000,
  })
}

export const useCreateStudioChat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { title?: string }) => createStudioChat({ data: input }),
    onSuccess: (result) => {
      if (result && !('id' in result)) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'chats'] })
    },
  })
}

export const useDeleteStudioChat = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (chatId: string) => deleteStudioChat({ data: { chatId } }),
    onSuccess: (result, chatId) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.removeQueries({ queryKey: ['studio', 'messages', chatId] })
      qc.invalidateQueries({ queryKey: ['studio', 'chats'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export const useStudioMessages = (chatId: string | null) => {
  return useQuery({
    queryKey: ['studio', 'messages', chatId],
    queryFn: () => getStudioMessages({ data: { chatId: chatId! } }),
    enabled: !!chatId,
    staleTime: 0,
    placeholderData: chatId ? undefined : [],
  })
}

// ---------------------------------------------------------------------------
// Attachment upload
// ---------------------------------------------------------------------------

export const useUploadStudioAttachment = () => {
  return useMutation({
    mutationFn: async (input: { fileName: string; mimeType: string; base64: string }) => {
      console.log('[chat-debug] upload RPC call', {
        fileName: input.fileName,
        mimeType: input.mimeType,
        base64Length: input.base64.length,
      })
      const res = await uploadStudioAttachment({ data: input })
      console.log('[chat-debug] upload RPC response', res)
      return res
    },
    onError: (err: unknown) => {
      console.log('[chat-debug] upload RPC onError', err)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    },
  })
}

// ---------------------------------------------------------------------------
// Send — the core hook
// ---------------------------------------------------------------------------

interface SendState {
  isStreaming: boolean
  streamingText: string
  error: string | null
  /** Latest tool-call results (e.g. generated asset URL) for canvas display. */
  lastToolResults: StudioToolCall[]
}

const TEMP_ID_PREFIX = 'studio-temp-'

export const useStudioChatStream = (chatId: string | null) => {
  const qc = useQueryClient()
  const [state, setState] = useState<SendState>({
    isStreaming: false,
    streamingText: '',
    error: null,
    lastToolResults: [],
  })
  const abortRef = useRef(false)

  const send = useCallback(
    async (
      content: string,
      options?: {
        attachmentUrl?: string | null
        attachmentMime?: string | null
        attachmentFileName?: string | null
        pendingAttachmentMsg?: StudioMessageRow
        overrideChatId?: string
      },
    ) => {
      const id = options?.overrideChatId ?? chatId
      const hasAttachment = !!options?.attachmentUrl
      console.log('[chat-debug] Studio send() entered', { id, hasContent: !!content.trim(), hasAttachment })
      if (!id || (!content.trim() && !hasAttachment)) {
        console.log('[chat-debug] ✋ Studio send() early-return (guard)')
        return
      }
      if (state.isStreaming) {
        console.log('[chat-debug] ✋ Studio send() early-return (streaming)')
        return
      }

      // Optimistic: show user message immediately (with attachment preview if any).
      const optimistic: StudioMessageRow =
        options?.pendingAttachmentMsg ?? {
          id: `${TEMP_ID_PREFIX}${Date.now()}`,
          chat_id: id,
          role: 'user',
          content,
          attachment_url: options?.attachmentUrl ?? null,
          asset_id: null,
          tool_calls: [],
          model: null,
          tokens_in: null,
          tokens_out: null,
          created_at: new Date().toISOString(),
        }
      qc.setQueryData<StudioMessageRow[]>(
        ['studio', 'messages', id],
        (old) => [...(old ?? []), optimistic],
      )

      abortRef.current = false
      setState({
        isStreaming: true,
        streamingText: '',
        error: null,
        lastToolResults: [],
      })

      try {
        const result = (await sendStudioMessage({
          data: {
            chatId: id,
            content,
            attachmentUrl: options?.attachmentUrl ?? null,
            attachmentMime: options?.attachmentMime ?? null,
            attachmentFileName: options?.attachmentFileName ?? null,
          },
        })) as
          | SendStudioMessageResult
          | { error: 'daily_message_limit_reached'; remaining: number; max: number | null; resetAt: string }
          | { error: string }

        const isLimit = (
          r: typeof result,
        ): r is {
          error: 'daily_message_limit_reached'
          remaining: number
          max: number | null
          resetAt: string
        } =>
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

        if (result.quota) {
          qc.setQueryData<PlanState>(['plan-state'], (current) =>
            patchMessageQuota(current, result.quota!),
          )
        }

        // Progressive reveal for typing UX.
        const fullText = result.reply
        const chunkSize = Math.max(1, Math.ceil(fullText.length / 80))
        for (let i = 0; i < fullText.length; i += chunkSize) {
          if (abortRef.current) break
          setState({
            isStreaming: true,
            streamingText: fullText.slice(0, i + chunkSize),
            error: null,
            lastToolResults: [],
          })
          await new Promise((r) => setTimeout(r, 12))
        }

        // Tool calls → toast + invalidate (assets, library).
        if (result.toolCalls.length > 0) {
          for (const tc of result.toolCalls) {
            if (tc.success) {
              toast.success(tc.message)
              if (tc.name === 'generate_image' || tc.name === 'generate_video') {
                qc.invalidateQueries({ queryKey: ['media', 'assets'] })
                qc.invalidateQueries({ queryKey: ['plan-state'] })
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
          lastToolResults: result.toolCalls,
        })

        qc.invalidateQueries({ queryKey: ['studio', 'messages', id] })
        qc.invalidateQueries({ queryKey: ['studio', 'chats'] })

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
          lastToolResults: [],
        })
        toast.error(message)
      }
    },
    [chatId, state.isStreaming, qc],
  )

  const stop = useCallback(() => {
    abortRef.current = true
    setState({
      isStreaming: false,
      streamingText: '',
      error: null,
      lastToolResults: [],
    })
  }, [])

  return { ...state, send, stop }
}

export type { StudioChatRow, StudioMessageRow, StudioToolCall }
