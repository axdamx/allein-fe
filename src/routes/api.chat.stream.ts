import { createFileRoute } from '@tanstack/react-router'
import type { ChatStreamEvent, ChatStreamInput } from '@/lib/chat-stream'
import { DEFAULT_MODEL_ID } from '@/lib/ai-provider'
import { sendMessageImpl } from '@/server/chat.server'

const encoder = new TextEncoder()

const encodeEvent = (event: ChatStreamEvent) =>
  encoder.encode(`${JSON.stringify(event)}\n`)

const isChatInput = (value: unknown): value is ChatStreamInput => {
  if (!value || typeof value !== 'object') return false
  const input = value as Record<string, unknown>
  const hasMessage =
    typeof input.content === 'string' && input.content.trim().length > 0
  const hasAttachment =
    typeof input.attachmentUrl === 'string' && input.attachmentUrl.length > 0

  return (
    typeof input.conversationId === 'string' &&
    input.conversationId.length > 0 &&
    typeof input.content === 'string' &&
    (hasMessage || hasAttachment)
  )
}

export const Route = createFileRoute('/api/chat/stream')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: unknown
        try {
          input = await request.json()
        } catch {
          return new Response('Invalid JSON body', { status: 400 })
        }

        if (!isChatInput(input)) {
          return new Response('Invalid chat request', { status: 400 })
        }

        const startedAt = performance.now()
        const providerAbort = new AbortController()
        let generationStartedAt: number | null = null
        let firstTokenAt: number | null = null
        let closed = false

        request.signal.addEventListener(
          'abort',
          () => providerAbort.abort(),
          { once: true },
        )

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const push = (event: ChatStreamEvent) => {
              if (closed) return
              try {
                controller.enqueue(encodeEvent(event))
              } catch {
                closed = true
                providerAbort.abort()
              }
            }

            void (async () => {
              try {
                const result = await sendMessageImpl(input, {
                  abortSignal: providerAbort.signal,
                  onGenerationStart: () => {
                    generationStartedAt = performance.now()
                  },
                  onDelta: (delta) => {
                    if (firstTokenAt === null) firstTokenAt = performance.now()
                    push({ type: 'text', delta })
                  },
                })

                if (providerAbort.signal.aborted) return

                if ('error' in result) {
                  if (
                    result.error === 'daily_message_limit_reached' &&
                    'remaining' in result
                  ) {
                    push({
                      type: 'error',
                      message: 'Daily message limit reached',
                      code: result.error,
                      remaining: result.remaining,
                      max: result.max,
                      resetAt: result.resetAt,
                    })
                  } else {
                    push({ type: 'error', message: result.error })
                  }
                  return
                }

                const finishedAt = performance.now()
                const timing = {
                  preparationMs:
                    generationStartedAt === null
                      ? 0
                      : Math.round(generationStartedAt - startedAt),
                  firstTokenMs:
                    firstTokenAt === null
                      ? null
                      : Math.round(firstTokenAt - startedAt),
                  totalMs: Math.round(finishedAt - startedAt),
                }

                console.info('[chat-performance]', {
                  model: result.model ?? DEFAULT_MODEL_ID,
                  ...timing,
                  memoryMb: Object.fromEntries(
                    Object.entries(process.memoryUsage()).map(([key, bytes]) => [
                      key,
                      Math.round((bytes / 1024 / 1024) * 10) / 10,
                    ]),
                  ),
                })

                push({
                  type: 'done',
                  toolCalls: result.toolCalls,
                  quota: result.quota ?? {
                    used: 0,
                    remaining: null,
                    max: null,
                    resetAt: new Date().toISOString(),
                  },
                  model: result.model ?? DEFAULT_MODEL_ID,
                  timing,
                })
              } catch {
                if (!providerAbort.signal.aborted) {
                  push({
                    type: 'error',
                    message: 'The assistant is unavailable. Please try again.',
                  })
                }
              } finally {
                if (!closed) {
                  closed = true
                  controller.close()
                }
              }
            })()
          },
          cancel() {
            closed = true
            providerAbort.abort()
          },
        })

        return new Response(stream, {
          headers: {
            'Cache-Control': 'no-cache, no-store, no-transform',
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'X-Accel-Buffering': 'no',
          },
        })
      },
    },
  },
})
