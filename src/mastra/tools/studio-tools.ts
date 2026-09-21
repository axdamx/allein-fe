/**
 * Mastra tools for the Studio agent.
 *
 * These tools let the chat agent generate images/videos and analyze uploaded
 * images. They run server-side (Mastra executes tools in the server runtime)
 * and reuse the Phase-1 media pipeline (`src/lib/media/*`) so behavior is
 * consistent with the standalone MediaGenerator.
 *
 * Ownership: the agent runs with `resourceId = owner_id` (set by the server fn
 * via `memory.resource`). Tools read that to scope Supabase writes.
 *
 * Plan gating: enforced per-feature inside each tool (image/video) — the agent
 * should still call the tool; if the user lacks the plan we return a friendly
 * error so the agent can explain instead of failing silently.
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { getSupabaseServiceClient } from '@/lib/supabase/service.server'
import { generateCogViewImage, getImageGenerationUserMessage, ZaiMediaError } from '@/lib/media/cogview'
import { submitCogVideoXJob } from '@/lib/media/cogvideox'
import { getDefaultModel } from '@/lib/ai-provider'
import { generateText } from 'ai'
import { assertSafeUrl } from '@/lib/url-guard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ownerHasFeature(
  ownerId: string,
  feature: 'aiImageGen' | 'aiVideoGen',
): Promise<boolean> {
  const supabase = getSupabaseServiceClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', ownerId)
    .single()
  const { PLAN_CONFIGS } = await import('@/lib/plans')
  const tier = (profile?.plan ?? 'free') as keyof typeof PLAN_CONFIGS
  return PLAN_CONFIGS[tier]?.features?.[feature] ?? false
}

/** Insert a studio_assets row on the owner's behalf (service-role bypasses RLS). */
async function insertAssetRow(
  ownerId: string,
  fields: {
    kind: 'image' | 'video'
    prompt: string
    provider_model: string
    status: 'processing' | 'ready' | 'failed'
    aspect_ratio?: string | null
    url?: string | null
    provider_id?: string | null
    error?: string | null
  },
) {
  const supabase = getSupabaseServiceClient()
  const { data, error } = await supabase
    .from('studio_assets')
    .insert({
      owner_id: ownerId,
      kind: fields.kind,
      prompt: fields.prompt,
      provider: 'zai',
      provider_model: fields.provider_model,
      status: fields.status,
      aspect_ratio: fields.aspect_ratio ?? null,
      url: fields.url ?? null,
      provider_id: fields.provider_id ?? null,
      error: fields.error ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

// ---------------------------------------------------------------------------
// generate_image
// ---------------------------------------------------------------------------

export const generateImageTool = createTool({
  id: 'generate_image',
  description:
    'Generate an image from a text prompt using CogView. Use this when the user asks to create, generate, make, or design an image, illustration, photo, or visual. Returns the image URL and asset id.',
  inputSchema: z.object({
    prompt: z
      .string()
      .describe('Detailed visual description of the image to generate.'),
    aspect_ratio: z
      .enum(['1:1', '16:9', '9:16', '4:3', '3:4'])
      .optional()
      .describe('Aspect ratio. Default 1:1.'),
  }),
  execute: async ({ prompt, aspect_ratio }, context) => {
    const ownerId = context?.agent?.resourceId
    if (!ownerId) return { success: false, error: 'No owner context' }

    const allowed = await ownerHasFeature(ownerId, 'aiImageGen')
    if (!allowed) {
      return {
        success: false,
        error:
          'Image generation requires the Pro plan or above. Ask the user to upgrade.',
      }
    }

    try {
      const result = await generateCogViewImage({
        prompt,
        aspectRatio: aspect_ratio ?? '1:1',
      })

      const row = await insertAssetRow(ownerId, {
        kind: 'image',
        prompt,
        provider_model: 'cogview-4-250304',
        status: 'ready',
        aspect_ratio: aspect_ratio ?? '1:1',
        url: result.remoteUrl,
      })

      return {
        success: true,
        assetId: row.id,
        url: result.remoteUrl,
        message: 'Image generated.',
      }
    } catch (err) {
      const msg = err instanceof ZaiMediaError ? err.message : 'Image generation failed'
      // Record the failure so the library shows it.
      await insertAssetRow(ownerId, {
        kind: 'image',
        prompt,
        provider_model: 'cogview-4-250304',
        status: 'failed',
        aspect_ratio: aspect_ratio ?? '1:1',
        error: msg,
      }).catch(() => null)
      return { success: false, error: getImageGenerationUserMessage(err) }
    }
  },
})

// ---------------------------------------------------------------------------
// generate_video (async submit only — polling happens client-side)
// ---------------------------------------------------------------------------

export const generateVideoTool = createTool({
  id: 'generate_video',
  description:
    'Submit a text-to-video (or image-to-video) generation job to CogVideoX. Use when the user asks to create a video, animation, or motion clip. The job runs asynchronously (~2-5 min); this returns a job id and asset id. The UI will poll and show progress.',
  inputSchema: z.object({
    prompt: z.string().describe('Description of the desired video.'),
    image_url: z
      .string()
      .optional()
      .describe('Optional source image URL for image-to-video.'),
    aspect_ratio: z
      .string()
      .optional()
      .describe(
        "Aspect ratio: '16:9' (landscape, default), '9:16' (portrait), or '1:1' (square).",
      ),
    duration: z
      .number()
      .optional()
      .describe('Duration in seconds — must be 5 or 10. Default 5.'),
    quality: z
      .enum(['speed', 'quality'])
      .optional()
      .describe("'speed' (faster, default) or 'quality' (higher fidelity)."),
  }),
  execute: async (
    { prompt, image_url, aspect_ratio, duration, quality },
    context,
  ) => {
    const ownerId = context?.agent?.resourceId
    if (!ownerId) return { success: false, error: 'No owner context' }

    const allowed = await ownerHasFeature(ownerId, 'aiVideoGen')
    if (!allowed) {
      return {
        success: false,
        error:
          'Video generation requires the Custom plan. Ask the user to upgrade.',
      }
    }

    try {
      // SSRF guard: validate any LLM-supplied source image URL before forwarding.
      if (image_url) {
        try {
          assertSafeUrl(image_url)
        } catch {
          return { success: false, error: 'The provided image URL is not allowed.' }
        }
      }
      const submission = await submitCogVideoXJob({
        prompt,
        imageUrl: image_url,
        aspectRatio: aspect_ratio ?? '16:9',
        durationSeconds: duration ?? 5,
        quality: quality ?? 'speed',
      })

      const row = await insertAssetRow(ownerId, {
        kind: 'video',
        prompt,
        provider_model: submission.model,
        status: 'processing',
        aspect_ratio: aspect_ratio ?? '16:9',
        provider_id: submission.taskId,
      })

      return {
        success: true,
        assetId: row.id,
        taskId: submission.taskId,
        message:
          'Video generation started. It will appear in the canvas when ready (~2-5 min).',
      }
    } catch (err) {
      const msg = err instanceof ZaiMediaError ? err.message : 'Video submit failed'
      return { success: false, error: msg }
    }
  },
})

// ---------------------------------------------------------------------------
// analyze_image — describe / answer questions about an uploaded image
// ---------------------------------------------------------------------------

export const analyzeImageTool = createTool({
  id: 'analyze_image',
  description:
    'Analyze an image (uploaded by the user or previously generated) and answer questions about it. Use when the user uploads an image and asks to describe, critique, remix, or improve it. Also use this before remixing: call analyze first to understand the source, then suggest improvements.',
  inputSchema: z.object({
    image_url: z.string().describe('URL of the image to analyze.'),
    question: z
      .string()
      .describe('What to find out, e.g. "Describe this image" or "How could I make it more vibrant?"'),
  }),
  execute: async ({ image_url, question }) => {
    try {
      // SSRF guard: validate the image URL before handing it to the model
      // provider (prompt injection could otherwise target internal hosts).
      try {
        assertSafeUrl(image_url)
      } catch {
        return { success: false, error: 'The provided image URL is not allowed.' }
      }
      const result = await generateText({
        model: getDefaultModel(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: question },
              { type: 'image', image: new URL(image_url) },
            ],
          },
        ],
        maxOutputTokens: 600,
      })
      return { success: true, analysis: result.text }
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Could not analyze image (model may not support vision).',
      }
    }
  },
})

export const studioTools = {
  generate_image: generateImageTool,
  analyze_image: analyzeImageTool,
}
