/**
 * Minimal HTTP client for ZAI's media endpoints (GLM-Image / CogVideoX).
 *
 * We don't install the official SDK because ZAI's image + video APIs are simple
 * JSON-over-HTTP and we want zero new dependencies for Phase 1. The same
 * API key + base URL as the LLM provider (`LLM_*`) is reused so users keep a
 * single credential.
 *
 * Server-only — every importer is a `.server.ts` file.
 */

const BASE_URL =
  process.env.LLM_BASE_URL?.replace(/\/$/, '') ||
  'https://api.z.ai/api/paas/v4'

const API_KEY = process.env.LLM_API_KEY

if (!API_KEY) {
  // Don't throw at module load (breaks typecheck/build without env); throw on use.
  console.warn('[media/zai-client] LLM_API_KEY is not set — media generation will fail.')
}

export class ZaiMediaError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ZaiMediaError'
    this.status = status
    this.body = body
  }
}

interface ZaiResponse<T> {
  ok: boolean
  status: number
  data: T
}

/**
 * Extract a human-readable error message from ZAI's various error shapes.
 *
 * ZAI returns errors in several formats depending on the endpoint and failure
 * mode — without handling all of them, String(error) produces "[object Object]"
 * which is useless to users. Handles:
 *
 *  - { error: { code, message } }   (ZAI native — most common)
 *  - { error: "string" }            (flat string)
 *  - { message: "string" }          (top-level message)
 *  - { error: { message } }         (OpenAI-style nested)
 *  - { detail: "string" }           (some validation paths)
 *  - [{ msg, path, ... }]           (array of validation errors)
 *
 * Returns null if nothing recognizable is found.
 */
function extractZaiErrorMessage(data: unknown): string | null {
  if (!data) return null
  if (typeof data === 'string') return data

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>

    // { error: { code, message } } — ZAI's canonical shape
    if (obj.error) {
      const err = obj.error
      if (typeof err === 'string') return err
      if (typeof err === 'object' && err !== null) {
        const e = err as Record<string, unknown>
        if (typeof e.message === 'string') {
          return e.code ? `${e.message} (code: ${e.code})` : e.message
        }
        if (typeof e.code === 'string') return `code: ${e.code}`
      }
    }

    // { message: "..." }
    if (typeof obj.message === 'string') return obj.message

    // { detail: "..." }
    if (typeof obj.detail === 'string') return obj.detail

    // [{ msg, path }, ...] — validation arrays
    if (Array.isArray(obj.detail)) {
      const first = obj.detail[0] as Record<string, unknown> | undefined
      if (first && typeof first.msg === 'string') return first.msg
    }
    if (Array.isArray(obj.errors)) {
      const first = obj.errors[0] as Record<string, unknown> | undefined
      if (first && typeof first.message === 'string') return first.message
    }
  }

  return null
}

async function zaiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ZaiResponse<T>> {  if (!API_KEY) {
    throw new ZaiMediaError('ZAI API key not configured', 500, null)
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
      ...(options.headers ?? {}),
    },
  })

  // ZAI returns JSON for both success and error; 200/299 are success.
  let data: unknown
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const errMsg = extractZaiErrorMessage(data) ?? `ZAI request failed (${res.status})`
    throw new ZaiMediaError(errMsg, res.status, data)
  }

  return { ok: true, status: res.status, data: data as T }
}

// ---------------------------------------------------------------------------
// Image generation — POST /v4/images/generations
// ---------------------------------------------------------------------------

export interface ZaiImageResult {
  url: string
  /** Some providers return base64; we normalize to a URL upstream. */
  b64?: string
  revised_prompt?: string
}

interface ZaiImageResponse {
  data?: ZaiImageResult[]
  created?: number
  content_filter?: Array<{ level: number }>
}

export interface GenerateImageParams {
  prompt: string
  /** Valid ZAI image models: 'cogview-4-250304' or 'glm-image'. */
  model?: 'glm-image' | 'cogview-4-250304'
  /** Pixel size like '1280x1280'; GLM-Image allows 1024-2048, divisible by 32. */
  size?: string
}

export const ZAI_IMAGE_MODEL = 'glm-image' as const

export async function generateImage({
  prompt,
  model = ZAI_IMAGE_MODEL,
  size = '1280x1280',
}: GenerateImageParams): Promise<ZaiImageResult> {
  const { data } = await zaiFetch<ZaiImageResponse>(
    '/images/generations',
    {
      method: 'POST',
      // NOTE: the GLM-Image / CogView-4 endpoint takes ONE image per call
      // (no `n` field). See https://docs.z.ai/api-reference/image/generate-image
      body: JSON.stringify({ model, prompt, size }),
    },
  )

  // Response: { data: [{ url }] }
  const fromData = data.data?.[0]
  if (fromData?.url) {
    return {
      url: fromData.url,
      b64: fromData.b64,
      revised_prompt: fromData.revised_prompt,
    }
  }

  throw new ZaiMediaError('ZAI returned no image in response', 200, data)
}

// ---------------------------------------------------------------------------
// Video generation — POST /v4/videos/generations (async)
// ---------------------------------------------------------------------------

export interface GenerateVideoParams {
  prompt: string
  model?: string
  /** Source image URL for image-to-video; omit for text-to-video. */
  image_url?: string
  /**
   * Pixel size for the output video. One of:
   * '1280x720', '720x1280', '1024x1024', '1920x1080', '1080x1920',
   * '2048x1080', '3840x2160'. Default '1280x720'.
   */
  size?: string
  /** Seconds; CogVideoX-3 supports 5 or 10. */
  duration?: number
  /** Quality preset — must be exactly 'speed' or 'quality'. */
  quality?: 'speed' | 'quality'
}

interface ZaiVideoSubmitResponse {
  id: string
  task_status?: string
  model?: string
  request_id?: string
}

/** Submit an async video job. Returns ZAI's task id. */
export async function submitVideoJob(
  params: GenerateVideoParams,
): Promise<{ taskId: string; model: string }> {
  const { data } = await zaiFetch<ZaiVideoSubmitResponse>(
    '/videos/generations',
    {
      method: 'POST',
      body: JSON.stringify({
        model: params.model ?? 'cogvideox-3',
        prompt: params.prompt,
        // image_url MUST be an array per the ZAI spec.
        image_url: params.image_url ? [params.image_url] : undefined,
        size: params.size ?? '1280x720',
        duration: params.duration ?? 5,
        quality: params.quality ?? 'speed',
      }),
    },
  )

  if (data.id) {
    return { taskId: data.id, model: data.model ?? params.model ?? 'cogvideox-3' }
  }
  throw new ZaiMediaError('ZAI video submit returned no task id', 200, data)
}

interface ZaiVideoPollResponse {
  model?: string
  /** 'PROCESSING' | 'SUCCESS' | 'FAIL' (uppercase per ZAI spec) */
  task_status?: string
  video_result?: Array<{ url: string; cover_image_url?: string }>
  request_id?: string
}

export interface VideoJobStatus {
  /** 'PROCESSING' | 'SUCCESS' | 'FAIL' */
  task_status: string
  video_url?: string
  cover_image_url?: string
  /** Free-form failure reason if status === 'FAIL'. */
  error?: string
}

/** Poll an async video job for status. GET /v4/async-result/{id}. */
export async function getVideoJobStatus(
  taskId: string,
): Promise<VideoJobStatus> {
  const { data } = await zaiFetch<ZaiVideoPollResponse>(
    `/async-result/${taskId}`,
    { method: 'GET' },
  )

  const status = (data.task_status ?? 'PROCESSING').toUpperCase()
  const result = data.video_result?.[0]

  return {
    task_status: status,
    video_url: result?.url,
    cover_image_url: result?.cover_image_url,
    error: status === 'FAIL' ? 'ZAI video generation failed' : undefined,
  }
}
