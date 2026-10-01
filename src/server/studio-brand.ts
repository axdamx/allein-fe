import { createServerFn } from '@tanstack/react-start'
import type { PostPlatform } from '@/server/marketing'
import type { StudioBrandKit } from '@/lib/studio-brand'

export type { StudioBrandKit, StudioPostTemplate } from '@/lib/studio-brand'

export type SaveBrandKitInput = Omit<StudioBrandKit, 'logoUrl'>

export interface SaveTemplateInput {
  id?: string
  name: string
  prompt: string
  platform: PostPlatform | null
  tone: string | null
}

export const getStudioBrandKit = createServerFn({ method: 'GET' }).handler(async () => {
  const { getStudioBrandKitImpl } = await import('./studio-brand.server')
  return getStudioBrandKitImpl()
})

export const saveStudioBrandKit = createServerFn({ method: 'POST' })
  .validator((data: SaveBrandKitInput) => data)
  .handler(async ({ data }) => {
    const { saveStudioBrandKitImpl } = await import('./studio-brand.server')
    return saveStudioBrandKitImpl(data)
  })

export const listStudioPostTemplates = createServerFn({ method: 'GET' }).handler(async () => {
  const { listStudioPostTemplatesImpl } = await import('./studio-brand.server')
  return listStudioPostTemplatesImpl()
})

export const saveStudioPostTemplate = createServerFn({ method: 'POST' })
  .validator((data: SaveTemplateInput) => data)
  .handler(async ({ data }) => {
    const { saveStudioPostTemplateImpl } = await import('./studio-brand.server')
    return saveStudioPostTemplateImpl(data)
  })

export const deleteStudioPostTemplate = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteStudioPostTemplateImpl } = await import('./studio-brand.server')
    return deleteStudioPostTemplateImpl(data.id)
  })
