import { createServerFn } from '@tanstack/react-start'

export interface StudioContentIdea {
  id: string
  title: string
  brief: string
  createdAt: string
}

export const listStudioContentIdeas = createServerFn({ method: 'GET' }).handler(async () => {
  const { listStudioContentIdeasImpl } = await import('./studio-ideas.server')
  return listStudioContentIdeasImpl()
})

export const updateStudioContentIdea = createServerFn({ method: 'POST' })
  .validator((data: { id: string; title: string; brief: string }) => data)
  .handler(async ({ data }) => {
    const { updateStudioContentIdeaImpl } = await import('./studio-ideas.server')
    return updateStudioContentIdeaImpl(data)
  })
