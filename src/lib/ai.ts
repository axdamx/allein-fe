/**
 * LLM client — provider-agnostic, OpenAI-compatible.
 *
 * Currently configured for ZAI (Zhipu) GLM API. Supports any OpenAI-compatible
 * provider by changing LLM_BASE_URL + LLM_API_KEY + model name.
 *
 * Default model: glm-5.2-turbo (fast, capable, included in ZAI subscription)
 *
 * All calls happen server-side (only imported by .server.ts files).
 */

const LLM_BASE_URL =
  process.env.LLM_BASE_URL || 'https://api.z.ai/api/paas/v4'
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY

/** Default model used when an agent doesn't specify one. */
export const DEFAULT_MODEL = process.env.LLM_DEFAULT_MODEL || 'glm-4.5-flash'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
  /** Called for reasoning tokens (e.g. GLM-4.5-flash thinking mode). */
  onReasoning?: (token: string) => void
}

/**
 * Stream a chat completion from the configured LLM provider.
 * Uses SSE (Server-Sent Events) — standard OpenAI format.
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  model: string,
  callbacks: StreamCallbacks,
  options?: { temperature?: number; maxTokens?: number },
): Promise<void> {
  if (!LLM_API_KEY) {
    callbacks.onError(new Error('LLM_API_KEY is not configured'))
    return
  }

  let response: Response
  try {
    response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    })
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
    return
  }

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => 'Unknown error')
    callbacks.onError(
      new Error(`LLM API error ${response.status}: ${text.slice(0, 200)}`),
    )
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          callbacks.onDone(fullText)
          return
        }
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta
          // GLM reasoning models emit reasoning_content (thinking) then content
          const reasoning = delta?.reasoning_content
          const token = delta?.content
          if (reasoning && callbacks.onReasoning) {
            callbacks.onReasoning(reasoning)
          }
          if (token) {
            fullText += token
            callbacks.onToken(token)
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
    callbacks.onDone(fullText)
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Non-streaming chat completion (for simple tasks like title generation).
 */
export async function chatCompletion(
  messages: ChatMessage[],
  model: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  if (!LLM_API_KEY) {
    throw new Error('LLM_API_KEY is not configured')
  }

  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error')
    throw new Error(`LLM API error ${response.status}: ${text.slice(0, 200)}`)
  }

  const json = await response.json()
  return json.choices?.[0]?.message?.content ?? ''
}
