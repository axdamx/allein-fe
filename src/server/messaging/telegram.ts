import { Bot } from 'grammy'

let bot: Bot | null = null

const getBot = () => {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN must be set')
    }
    bot = new Bot(token)
  }
  return bot
}

export const sendTelegram = async (
  chatId: string | number,
  text: string,
): Promise<{ success: true; messageId: number } | { success: false; error: string }> => {
  try {
    const msg = await getBot().api.sendMessage(Number(chatId), text)
    return { success: true, messageId: msg.message_id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export const parseTelegramUpdate = (update: Record<string, unknown>): {
  chatId: number
  text?: string
  username?: string
  firstName?: string
  type: 'start' | 'message' | 'other'
} | null => {
  if (!update.message || typeof update.message !== 'object') return null

  const msg = update.message as Record<string, unknown>
  const chat = msg.chat as Record<string, unknown> | undefined
  if (!chat || typeof chat.id !== 'number') return null

  const chatId = chat.id
  const from = msg.from as Record<string, unknown> | undefined
  const username = from?.username as string | undefined
  const firstName = from?.first_name as string | undefined
  const text = msg.text as string | undefined

  if (text === '/start') {
    return { chatId, username, firstName, type: 'start' }
  }

  if (text) {
    return { chatId, text, username, firstName, type: 'message' }
  }

  return { chatId, type: 'other' }
}

export const getTelegramWebhookUrl = (baseUrl: string): string => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set')
  return `${baseUrl.replace(/\/$/, '')}/api/messaging/telegram`
}

export const setTelegramWebhook = async (url: string): Promise<void> => {
  await getBot().api.setWebhook(url)
}

export const deleteTelegramWebhook = async (): Promise<void> => {
  await getBot().api.deleteWebhook()
}
