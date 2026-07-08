/**
 * Public server functions for the Studio chat.
 * Client-callable via RPC. Implementations live in studio-chat.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

export type {
  StudioChatRow,
  StudioMessageRow,
  StudioToolCall,
  SendStudioMessageResult,
  StudioLimitResult,
} from './studio-chat.server'

export const listStudioChats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { listStudioChatsImpl } = await import('./studio-chat.server')
    return listStudioChatsImpl()
  },
)

export const createStudioChat = createServerFn({ method: 'POST' })
  .validator((d: { title?: string }) => d)
  .handler(async ({ data }) => {
    const { createStudioChatImpl } = await import('./studio-chat.server')
    return createStudioChatImpl(data)
  })

export const deleteStudioChat = createServerFn({ method: 'POST' })
  .validator((d: { chatId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteStudioChatImpl } = await import('./studio-chat.server')
    return deleteStudioChatImpl(data.chatId)
  })

export const getStudioMessages = createServerFn({ method: 'GET' })
  .validator((d: { chatId: string }) => d)
  .handler(async ({ data }) => {
    const { getStudioMessagesImpl } = await import('./studio-chat.server')
    return getStudioMessagesImpl(data.chatId)
  })

export const uploadStudioAttachment = createServerFn({ method: 'POST' })
  .validator(
    (d: { fileName: string; mimeType: string; base64: string }) => d,
  )
  .handler(async ({ data }) => {
    const { uploadStudioAttachmentImpl } = await import('./studio-chat.server')
    return uploadStudioAttachmentImpl(data)
  })

export const sendStudioMessage = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      chatId: string
      content: string
      attachmentUrl?: string | null
    }) => d,
  )
  .handler(async ({ data }) => {
    const { sendStudioMessageImpl } = await import('./studio-chat.server')
    return sendStudioMessageImpl(data)
  })
