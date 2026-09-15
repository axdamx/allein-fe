/**
 * Public server functions for the chat module.
 * Client-callable via RPC. Implementations live in chat.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

export interface ConversationRow {
  id: string
  agent_id: string
  owner_id: string
  title: string
  summary: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  attachment_url: string | null
  attachment_mime: string | null
  attachment_name: string | null
  tokens_in: number | null
  tokens_out: number | null
  model: string | null
  created_at: string
}

export interface SendMessageResult {
  reply: string
  toolCalls: Array<{
    name: string
    success: boolean
    message: string
  }>
  /** Updated daily-quota state after this message (merged into plan state). */
  quota?: {
    used: number
    remaining: number | null
    max: number | null
    resetAt: string
  }
  /** Actual provider model used for this turn. */
  model?: string
}

/** Returned when the user's daily message quota is exhausted. */
export interface SendMessageLimitResult {
  error: 'daily_message_limit_reached'
  remaining: number
  max: number | null
  resetAt: string
}

export const getConversations = createServerFn({ method: 'GET' })
  .validator((d: { agentId?: string }) => d)
  .handler(async ({ data }) => {
    const { getConversationsImpl } = await import('./chat.server')
    return getConversationsImpl(data.agentId)
  })

export const createConversation = createServerFn({ method: 'POST' })
  .validator((d: { agentId: string; title?: string }) => d)
  .handler(async ({ data }) => {
    const { createConversationImpl } = await import('./chat.server')
    return createConversationImpl(data)
  })

export const deleteConversation = createServerFn({ method: 'POST' })
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteConversationImpl } = await import('./chat.server')
    return deleteConversationImpl(data.conversationId)
  })

export const getMessages = createServerFn({ method: 'GET' })
  .validator((d: { conversationId: string }) => d)
  .handler(async ({ data }) => {
    const { getMessagesImpl } = await import('./chat.server')
    return getMessagesImpl(data.conversationId)
  })

export const sendMessage = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      conversationId: string
      content: string
      attachmentUrl?: string | null
      attachmentMime?: string | null
      attachmentFileName?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    // Daily quota is enforced atomically inside sendMessageImpl via the
    // try_consume RPC (race-proof). The previous lifetime enforceLimit
    // call here was both wrong-window and redundant — removed.
    const { sendMessageImpl } = await import('./chat.server')
    return sendMessageImpl(data)
  })
