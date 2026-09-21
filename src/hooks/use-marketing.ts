import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPosts,
  generatePost,
  createPost,
  updatePost,
  duplicatePost,
  deletePost,
  type PostRow,
  type PostPlatform,
  type GeneratedPost,
  type CreatePostInput,
  type UpdatePostInput,
} from '@/server/marketing'

export const usePosts = () => {
  return useQuery({
    queryKey: ['marketing', 'posts'],
    queryFn: () => getPosts(),
    staleTime: 20 * 1000,
  })
}

export const useGeneratePost = () => {
  return useMutation({
    mutationFn: (input: {
      prompt: string
      platform: PostPlatform
      tone?: string
      agentId?: string
    }) => generatePost({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) toast.error(result.error)
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      toast.error(msg)
    },
  })
}

export const useCreatePost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost({ data: input }),
    onSuccess: (result) => {
      // Daily post limit hit — show a friendly message with reset time and
      // refresh plan state so usage indicators update.
      if (
        'error' in result &&
        typeof (result as { remaining?: unknown }).remaining === 'number'
      ) {
        const r = result as {
          error: string
          remaining: number
          max: number | null
          resetAt: string
        }
        const resetLabel = new Date(r.resetAt).toLocaleString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        toast.error(
          `Daily post limit reached (${r.max ?? '—'}). Resets at ${resetLabel}.`,
        )
        qc.invalidateQueries({ queryKey: ['plan-state'] })
        return
      }

      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Post saved')
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] })
      qc.invalidateQueries({ queryKey: ['studio', 'content-ideas'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save post'),
  })
}

export const useUpdatePost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdatePostInput) => updatePost({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not update post'),
  })
}

export const useDuplicatePost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => duplicatePost({ data: { id } }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error === 'daily_post_limit_reached'
          ? 'Daily post limit reached. Please try again after the quota resets.'
          : result.error)
        return
      }
      toast.success('Draft duplicated')
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] })
      qc.invalidateQueries({ queryKey: ['studio', 'content-ideas'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not duplicate post'),
  })
}

export const useDeletePost = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePost({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Post deleted')
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
  })
}

export type { PostRow, PostPlatform, GeneratedPost }
