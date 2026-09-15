/** Shared wire types for the browser-to-server chat stream. */

export interface ChatStreamInput {
  conversationId: string
  content: string
  attachmentUrl?: string | null
  attachmentMime?: string | null
  attachmentFileName?: string | null
}

export interface ChatToolCallResult {
  name: string
  success: boolean
  message: string
}

export interface ChatQuotaSnapshot {
  used: number
  remaining: number | null
  max: number | null
  resetAt: string
}

export type ChatStreamEvent =
  | { type: 'text'; delta: string }
  | {
      type: 'done'
      toolCalls: ChatToolCallResult[]
      quota: ChatQuotaSnapshot
      model: string
      timing: {
        preparationMs: number
        firstTokenMs: number | null
        totalMs: number
      }
    }
  | {
      type: 'error'
      message: string
      code?: 'daily_message_limit_reached'
      remaining?: number
      max?: number | null
      resetAt?: string
    }
