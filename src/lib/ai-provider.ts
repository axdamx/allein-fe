/**
 * Vercel AI SDK — model provider configuration.
 *
 * Uses @ai-sdk/openai-compatible to connect to ZAI (GLM) API.
 * This gives us native tool calling, structured outputs, and streaming
 * through the AI SDK's unified interface.
 *
 * Server-only (only imported by .server.ts files).
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

// Suppress AI SDK warnings about unsupported provider features.
// ZAI/GLM doesn't support responseFormat (json_schema), but generateObject
// still works via prompt-based JSON fallback. This global must be set on
// globalThis, not process.env — the AI SDK checks the global directly.
;(globalThis as Record<string, unknown>).AI_SDK_LOG_WARNINGS = false

const baseURL =
  process.env.LLM_BASE_URL || 'https://api.z.ai/api/paas/v4'

export const provider = createOpenAICompatible({
  name: 'zai',
  baseURL,
  apiKey: process.env.LLM_API_KEY!,
})

/** Default model for chat + agent actions. */
export const DEFAULT_MODEL_ID =
  process.env.LLM_DEFAULT_MODEL || 'glm-4.5-flash'

/**
 * Get a model instance for use with streamText/generateText/generateObject.
 *
 * @example
 * import { getDefaultModel } from '@/lib/ai-provider'
 * const model = getDefaultModel()
 * const result = await streamText({ model, messages, tools })
 */
export const getDefaultModel = () => {
  return provider(DEFAULT_MODEL_ID)
}

/**
 * Get a specific model by ID (for when you need a different model).
 */
export const getModel = (modelId: string) => {
  return provider(modelId)
}
