/**
 * CogView image generation (text → image).
 *
 * Thin wrapper around the ZAI client that maps app-level aspect ratios to
 * CogView-4 size strings and normalizes the output to a URL + buffer so the
 * caller can persist it to Supabase Storage regardless of the provider shape.
 *
 * Server-only.
 */
import { generateImage, ZaiMediaError } from './zai-client'

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4'

const ASPECT_TO_SIZE: Record<ImageAspectRatio, string> = {
  // ZAI CogView-4 requires dimensions in [1024, 2048], divisible by 32.
  '1:1': '1280x1280',
  '16:9': '1568x1056',
  '9:16': '1056x1568',
  '4:3': '1472x1088',
  '3:4': '1088x1472',
}

export interface CogViewInput {
  prompt: string
  aspectRatio?: ImageAspectRatio
  /** Valid ZAI image model: 'cogview-4-250304' (default) or 'glm-image'. */
  model?: string
}

export interface CogViewOutput {
  /** The remote URL ZAI produced (may be ephemeral — caller should mirror it). */
  remoteUrl: string
  /** Optional base64 image (without data: prefix) for direct upload. */
  b64?: string
  /** The size string actually sent to the model. */
  size: string
}

export async function generateCogViewImage(
  input: CogViewInput,
): Promise<CogViewOutput> {
  const size = ASPECT_TO_SIZE[input.aspectRatio ?? '1:1']
  const result = await generateImage({
    prompt: input.prompt,
    model: input.model ?? 'cogview-4-250304',
    size,
  })

  return {
    remoteUrl: result.url,
    b64: result.b64,
    size,
  }
}

/** Safe client-facing message for image provider failures. */
export function getImageGenerationUserMessage(err: unknown): string {
  // Z.AI code 1113 means the account needs credit or an image resource package.
  if (err instanceof ZaiMediaError && err.message.includes('(code: 1113)')) {
    return 'Image generation is temporarily unavailable. Please contact support.'
  }
  return 'Image generation failed. Please try again or check the Library for details.'
}

export { ZaiMediaError }
