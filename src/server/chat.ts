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
  .validator((d: { conversationId: string; content: string }) => d)
  .handler(async ({ data }) => {
    const { sendMessageImpl } = await import('./chat.server')
    return sendMessageImpl(data)
  })
