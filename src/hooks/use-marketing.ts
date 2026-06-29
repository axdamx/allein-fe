import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getPosts,
  generatePost,
  createPost,
  updatePost,
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
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Post saved')
      qc.invalidateQueries({ queryKey: ['marketing', 'posts'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
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
