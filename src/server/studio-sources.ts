import { createServerFn } from '@tanstack/react-start'

export type { StudioSource, StudioSourceKind, StudioSourceSnapshot, StudioSourceCandidate, StudioSourceCandidatePreview } from './studio-sources.server'

export const listStudioSources = createServerFn({ method: 'GET' }).handler(async () => {
  const { listStudioSourcesImpl } = await import('./studio-sources.server')
  return listStudioSourcesImpl()
})

export const listStudioSourceCandidates = createServerFn({ method: 'GET' }).handler(async () => {
  const { listStudioSourceCandidatesImpl } = await import('./studio-sources.server')
  return listStudioSourceCandidatesImpl()
})

export const previewStudioSourceCandidate = createServerFn({ method: 'POST' })
  .validator((data: { id: string; kind: 'knowledge' | 'crm' }) => data)
  .handler(async ({ data }) => {
    const { previewStudioSourceCandidateImpl } = await import('./studio-sources.server')
    return previewStudioSourceCandidateImpl(data)
  })

export const saveStudioSource = createServerFn({ method: 'POST' })
  .validator((data: { id?: string; kind: 'listing' | 'crm' | 'knowledge'; title: string; facts: string; referenceUrl?: string; approved: boolean }) => data)
  .handler(async ({ data }) => {
    const { saveStudioSourceImpl } = await import('./studio-sources.server')
    return saveStudioSourceImpl(data)
  })

export const deleteStudioSource = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteStudioSourceImpl } = await import('./studio-sources.server')
    return deleteStudioSourceImpl(data.id)
  })
