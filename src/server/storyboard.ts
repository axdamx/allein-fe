/**
 * Public server functions for Studio storyboards.
 * Client-callable via RPC. Implementations live in storyboard.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

export type {
  StoryboardRow,
  SceneRow,
  StoryboardWithScenes,
  GeneratedScenePlan,
  UpsertSceneInput,
} from './storyboard.server'

export const listStoryboards = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { listStoryboardsImpl } = await import('./storyboard.server')
    return listStoryboardsImpl()
  },
)

export const getStoryboard = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { getStoryboardImpl } = await import('./storyboard.server')
    return getStoryboardImpl(data.id)
  })

export const createStoryboard = createServerFn({ method: 'POST' })
  .validator(
    (d: { title?: string; brief?: string; aspectRatio?: string }) => d,
  )
  .handler(async ({ data }) => {
    const { createStoryboardImpl } = await import('./storyboard.server')
    return createStoryboardImpl(data)
  })

export const updateStoryboard = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      id: string
      title?: string
      brief?: string
      aspectRatio?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const { updateStoryboardImpl } = await import('./storyboard.server')
    return updateStoryboardImpl(data)
  })

export const deleteStoryboard = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { deleteStoryboardImpl } = await import('./storyboard.server')
    return deleteStoryboardImpl(data.id)
  })

export const upsertScene = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      id?: string
      storyboardId: string
      caption?: string
      prompt?: string
      imageUrl?: string | null
      assetId?: string | null
      durationMs?: number
    }) => d,
  )
  .handler(async ({ data }) => {
    const { upsertSceneImpl } = await import('./storyboard.server')
    return upsertSceneImpl(data)
  })

export const deleteScene = createServerFn({ method: 'POST' })
  .validator((d: { sceneId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteSceneImpl } = await import('./storyboard.server')
    return deleteSceneImpl(data.sceneId)
  })

export const reorderScenes = createServerFn({ method: 'POST' })
  .validator((d: { storyboardId: string; sceneIds: string[] }) => d)
  .handler(async ({ data }) => {
    const { reorderScenesImpl } = await import('./storyboard.server')
    return reorderScenesImpl(data)
  })

export const generateStoryboardFromBrief = createServerFn({
  method: 'POST',
})
  .validator(
    (d: {
      brief: string
      sceneCount?: number
      aspectRatio?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const { generateStoryboardFromBriefImpl } = await import(
      './storyboard.server'
    )
    return generateStoryboardFromBriefImpl(data)
  })
