import { Bot } from 'grammy'

let bot: Bot | null = null

function getBot() {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN must be set')
    }
    bot = new Bot(token)
  }
  return bot
}

export async function sendTelegram(
  chatId: string | number,
  text: string,
): Promise<{ success: true; messageId: number } | { success: false; error: string }> {
  try {
    const msg = await getBot().api.sendMessage(Number(chatId), text)
    return { success: true, messageId: msg.message_id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export function parseTelegramUpdate(update: Record<string, unknown>): {
  chatId: number
  text?: string
  username?: string
  firstName?: string
  type: 'start' | 'message' | 'other'
} | null {
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

export function getTelegramWebhookUrl(baseUrl: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set')
  return `${baseUrl.replace(/\/$/, '')}/api/messaging/telegram`
}

export async function setTelegramWebhook(url: string): Promise<void> {
  await getBot().api.setWebhook(url)
}

export async function deleteTelegramWebhook(): Promise<void> {
  await getBot().api.deleteWebhook()
}
