import { createServerFn } from '@tanstack/react-start'

export interface StudioAssetFolder {
  id: string
  name: string
}

export const listStudioAssetFolders = createServerFn({ method: 'GET' }).handler(async () => {
  const { listStudioAssetFoldersImpl } = await import('./studio-library.server')
  return listStudioAssetFoldersImpl()
})

export const saveStudioAssetFolder = createServerFn({ method: 'POST' })
  .validator((data: { id?: string; name: string }) => data)
  .handler(async ({ data }) => {
    const { saveStudioAssetFolderImpl } = await import('./studio-library.server')
    return saveStudioAssetFolderImpl(data)
  })

export const deleteStudioAssetFolder = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { deleteStudioAssetFolderImpl } = await import('./studio-library.server')
    return deleteStudioAssetFolderImpl(data.id)
  })

export const moveStudioAsset = createServerFn({ method: 'POST' })
  .validator((data: { assetId: string; folderId: string | null }) => data)
  .handler(async ({ data }) => {
    const { moveStudioAssetImpl } = await import('./studio-library.server')
    return moveStudioAssetImpl(data)
  })
