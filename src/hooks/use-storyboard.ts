/**
 * TanStack Query hooks for Studio storyboards.
 *
 * List/get storyboards, scene CRUD, and a compound mutation that:
 *   1. calls generateStoryboardFromBrief (LLM produces N scene prompts)
 *   2. creates a storyboard
 *   3. inserts each scene row
 * Returns the new storyboard id so the UI can navigate into it.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  listStoryboards,
  getStoryboard,
  createStoryboard,
  updateStoryboard,
  deleteStoryboard,
  upsertScene,
  deleteScene,
  reorderScenes,
  generateStoryboardFromBrief,
  type StoryboardRow,
  type StoryboardWithScenes,
  type SceneRow,
} from '@/server/storyboard'

// ---------------------------------------------------------------------------
// Storyboards
// ---------------------------------------------------------------------------

export const useStoryboards = () => {
  return useQuery({
    queryKey: ['studio', 'storyboards'],
    queryFn: () => listStoryboards(),
    staleTime: 15 * 1000,
  })
}

export const useStoryboard = (id: string | null) => {
  return useQuery({
    queryKey: ['studio', 'storyboard', id],
    queryFn: () => getStoryboard({ data: { id: id! } }),
    enabled: !!id,
    staleTime: 0,
  })
}

export const useCreateStoryboard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title?: string
      brief?: string
      aspectRatio?: string
    }) => createStoryboard({ data: input }),
    onSuccess: (result) => {
      if (result && !('id' in result)) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'storyboards'] })
    },
  })
}

export const useUpdateStoryboard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      title?: string
      brief?: string
      aspectRatio?: string
    }) => updateStoryboard({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'storyboards'] })
      qc.invalidateQueries({ queryKey: ['studio', 'storyboard'] })
    },
  })
}

export const useDeleteStoryboard = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStoryboard({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'storyboards'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export const useUpsertScene = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string
      storyboardId: string
      caption?: string
      prompt?: string
      imageUrl?: string | null
      assetId?: string | null
      durationMs?: number
    }) => upsertScene({ data: input }),
    onSuccess: (result) => {
      if (result && 'error' in result) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'storyboard'] })
    },
  })
}

export const useDeleteScene = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sceneId: string) => deleteScene({ data: { sceneId } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'storyboard'] })
    },
  })
}

export const useReorderScenes = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { storyboardId: string; sceneIds: string[] }) =>
      reorderScenes({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['studio', 'storyboard'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Generate-from-brief — compound mutation (plan → storyboard → scenes)
// ---------------------------------------------------------------------------

export const useGenerateStoryboardFromBrief = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      brief: string
      sceneCount?: number
      aspectRatio?: string
      title?: string
    }): Promise<{ storyboardId: string } | { error: string }> => {
      // 1. Plan with LLM
      const plan = await generateStoryboardFromBrief({
        data: {
          brief: input.brief,
          sceneCount: input.sceneCount,
          aspectRatio: input.aspectRatio,
        },
      })
      if (plan && !('title' in plan)) return { error: plan.error }
      if (!plan || !('title' in plan)) return { error: 'Plan failed' }

      // 2. Create storyboard
      const sb = await createStoryboard({
        data: {
          title: input.title ?? plan.title,
          brief: input.brief,
          aspectRatio: input.aspectRatio ?? '16:9',
        },
      })
      if (sb && !('id' in sb)) return { error: sb.error }
      if (!sb || !('id' in sb)) return { error: 'Create storyboard failed' }

      // 3. Insert each scene (sequential — positions are assigned server-side)
      for (const scene of plan.scenes) {
        await upsertScene({
          data: {
            storyboardId: sb.id,
            caption: scene.caption,
            prompt: scene.prompt,
            durationMs: scene.duration_ms,
          },
        })
      }

      return { storyboardId: sb.id }
    },
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Storyboard created')
      qc.invalidateQueries({ queryKey: ['studio', 'storyboards'] })
      qc.invalidateQueries({ queryKey: ['studio', 'storyboard'] })
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    },
  })
}

export type { StoryboardRow, StoryboardWithScenes, SceneRow }
