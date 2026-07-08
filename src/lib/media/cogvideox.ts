/**
 * CogVideoX video generation (text/image → video, async).
 *
 * Two-step flow:
 *   1. submitVideo() — POST the job, get a ZAI task id
 *   2. pollVideo()   — GET the status until SUCCESS/FAIL
 *
 * The server stores the task id on `studio_assets` immediately so the user can
 * navigate away; the client polls via `getVideoStatus`.
 *
 * Server-only.
 */
import {
  submitVideoJob,
  getVideoJobStatus,
  ZaiMediaError,
} from './zai-client'

export interface CogVideoXSubmitInput {
  prompt: string
  /** Optional source image URL for image-to-video. */
  imageUrl?: string
  /**
   * Aspect ratio token: '16:9' | '9:16' | '1:1'. Mapped to a valid ZAI pixel
   * size before submission.
   */
  aspectRatio?: string
  /** Seconds — CogVideoX-3 supports 5 or 10. */
  durationSeconds?: number
  /** 'speed' (default, faster) or 'quality' (higher fidelity). */
  quality?: 'speed' | 'quality'
  model?: string
}

export interface CogVideoXSubmission {
  taskId: string
  model: string
}

/** Map an aspect-ratio token to a valid ZAI video size string. */
const ASPECT_TO_VIDEO_SIZE: Record<string, string> = {
  '16:9': '1280x720',
  '9:16': '720x1280',
  '1:1': '1024x1024',
}

export async function submitCogVideoXJob(
  input: CogVideoXSubmitInput,
): Promise<CogVideoXSubmission> {
  return submitVideoJob({
    prompt: input.prompt,
    model: input.model ?? 'cogvideox-3',
    image_url: input.imageUrl,
    size: ASPECT_TO_VIDEO_SIZE[input.aspectRatio ?? '16:9'] ?? '1280x720',
    duration: input.durationSeconds,
    quality: input.quality,
  })
}

export interface VideoJobResult {
  status: 'processing' | 'success' | 'failed'
  videoUrl?: string
  coverImageUrl?: string
  error?: string
}

/** Poll once. The server/client is responsible for retry cadence. */
export async function pollCogVideoXJob(
  taskId: string,
): Promise<VideoJobResult> {
  const result = await getVideoJobStatus(taskId)

  switch (result.task_status) {
    case 'SUCCESS':
      return {
        status: 'success',
        videoUrl: result.video_url,
        coverImageUrl: result.cover_image_url,
      }
    case 'FAIL':
      return { status: 'failed', error: result.error ?? 'Generation failed' }
    default:
      return { status: 'processing' }
  }
}

export { ZaiMediaError }
