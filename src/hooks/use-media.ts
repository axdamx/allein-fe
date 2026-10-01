/**
 * TanStack Query hooks for AI media generation.
 *
 * Image generation is a one-shot mutation. Video generation is async:
 * submit → poll until ready. The polling hook exposes progress so the UI can
 * render a spinner / status without managing timers itself.
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  generateImage,
  uploadStudioImage,
  submitVideo,
  pollVideo,
  listAssets,
  deleteAsset,
  type StudioAssetRow,
  type MediaKind,
  type GenerateImageInput,
  type SubmitVideoInput,
} from '@/server/media'

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export const useAssets = (kind?: MediaKind) => {
  return useQuery({
    queryKey: ['media', 'assets', kind ?? 'all'],
    queryFn: () => listAssets({ data: { kind } }),
    staleTime: 10 * 1000,
  })
}

export const useDeleteAsset = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: string) => deleteAsset({ data: { assetId } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Asset deleted')
      qc.invalidateQueries({ queryKey: ['media', 'assets'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export const useGenerateImage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateImageInput) => generateImage({ data: input }),
    onSuccess: (result) => {
      if (result && !('id' in result)) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['media', 'assets'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Image generation failed'
      // Surface plan-gate errors distinctly.
      if (err instanceof Error && err.name === 'PlanFeatureError') {
        toast.error('Upgrade your plan to generate images.')
      } else {
        toast.error(msg)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
  })
}

export const useUploadStudioImage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 10 * 1024 * 1024) return { error: 'Image is too large. Maximum size is 10 MB.' }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Could not read the image.'))
        reader.onload = () => {
          const value = String(reader.result ?? '')
          resolve(value.slice(value.indexOf(',') + 1))
        }
        reader.readAsDataURL(file)
      })
      return uploadStudioImage({ data: { fileName: file.name, mimeType: file.type, base64 } })
    },
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Image saved to Studio library')
      qc.invalidateQueries({ queryKey: ['media', 'assets'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Image upload failed'),
  })
}

// ---------------------------------------------------------------------------
// Video generation (async submit + poll)
// ---------------------------------------------------------------------------

export interface VideoGenerationState {
  asset: StudioAssetRow | null
  status: 'idle' | 'submitting' | 'processing' | 'ready' | 'failed'
  error: string | null
}

/**
 * Drives the full video generation lifecycle.
 *
 * - `submit(prompt)` calls the server, stores the asset row (with ZAI task id)
 * - On success, automatically polls `pollVideo` every ~8s until `ready`/`failed`
 * - Caller reads `state.status` + `state.asset` for rendering
 */
export const useGenerateVideo = () => {
  const qc = useQueryClient()
  const [state, setState] = useState<VideoGenerationState>({
    asset: null,
    status: 'idle',
    error: null,
  })
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeAssetId = useRef<string | null>(null)

  const clearPoll = () => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current)
      pollTimer.current = null
    }
  }

  const poll = async (assetId: string) => {
    const result = await pollVideo({ data: { assetId } })
    if (result && !('id' in result)) {
      setState({ asset: null, status: 'failed', error: result.error })
      return
    }
    const asset = result as StudioAssetRow
    if (asset.status === 'ready') {
      setState({ asset, status: 'ready', error: null })
      qc.invalidateQueries({ queryKey: ['media', 'assets'] })
      return
    }
    if (asset.status === 'failed') {
      setState({ asset, status: 'failed', error: asset.error ?? 'Generation failed' })
      return
    }
    // Still processing — keep the asset visible and schedule next poll.
    setState({ asset, status: 'processing', error: null })
    pollTimer.current = setTimeout(() => poll(assetId), 8000)
  }

  const submit = async (input: SubmitVideoInput) => {
    clearPoll()
    setState({ asset: null, status: 'submitting', error: null })
    try {
      const result = await submitVideo({ data: input })
      if (result && !('id' in result)) {
        setState({ asset: null, status: 'failed', error: result.error })
        return result
      }
      const asset = result as StudioAssetRow
      activeAssetId.current = asset.id
      setState({ asset, status: 'processing', error: null })
      // Kick off polling.
      poll(asset.id)
      return asset
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Video submission failed'
      const isPlan = err instanceof Error && err.name === 'PlanFeatureError'
      setState({
        asset: null,
        status: 'failed',
        error: isPlan ? 'Upgrade your plan to generate videos.' : msg,
      })
      throw err
    }
  }

  const reset = () => {
    clearPoll()
    activeAssetId.current = null
    setState({ asset: null, status: 'idle', error: null })
  }

  // Cleanup on unmount.
  useEffect(() => clearPoll, [])

  return { submit, reset, state }
}
