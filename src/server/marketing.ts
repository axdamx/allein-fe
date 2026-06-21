/**
 * Public server functions for the Marketing Studio.
 * Client-callable via RPC. Implementations live in marketing.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

export type {
  PostRow,
  CampaignRow,
  PostPlatform,
  PostStatus,
  GeneratedPost,
  CreatePostInput,
} from '@/server/marketing.server'

import type {
  PostPlatform,
  CreatePostInput,
  PostStatus,
} from '@/server/marketing.server'

export interface UpdatePostInput {
  id: string
  title?: string
  caption?: string
  hashtags?: string[]
  scheduledFor?: string | null
  status?: PostStatus
}

export const getPosts = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getPostsImpl } = await import('./marketing.server')
    return getPostsImpl()
  },
)

export const generatePost = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      prompt: string
      platform: PostPlatform
      tone?: string
      agentId?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const { generatePostImpl } = await import('./marketing.server')
    return generatePostImpl(data)
  })

export const createPost = createServerFn({ method: 'POST' })
  .validator((d: CreatePostInput) => d)
  .handler(async ({ data }) => {
    const { createPostImpl } = await import('./marketing.server')
    return createPostImpl(data)
  })

export const updatePost = createServerFn({ method: 'POST' })
  .validator((d: UpdatePostInput) => d)
  .handler(async ({ data }) => {
    const { updatePostImpl } = await import('./marketing.server')
    return updatePostImpl(data)
  })

export const deletePost = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { deletePostImpl } = await import('./marketing.server')
    return deletePostImpl(data.id)
  })
