import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  deleteStudioAssetFolder,
  listStudioAssetFolders,
  moveStudioAsset,
  saveStudioAssetFolder,
} from '@/server/studio-library'

export function useStudioAssetFolders() {
  return useQuery({
    queryKey: ['studio', 'asset-folders'],
    queryFn: () => listStudioAssetFolders(),
  })
}

export function useSaveStudioAssetFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id?: string; name: string }) => saveStudioAssetFolder({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) return toast.error(result.error)
      toast.success('Folder saved')
      qc.invalidateQueries({ queryKey: ['studio', 'asset-folders'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save folder'),
  })
}

export function useDeleteStudioAssetFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStudioAssetFolder({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) return toast.error(result.error)
      toast.success('Folder deleted. Its assets are now uncategorized.')
      qc.invalidateQueries({ queryKey: ['studio', 'asset-folders'] })
      qc.invalidateQueries({ queryKey: ['media', 'assets'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not delete folder'),
  })
}

export function useMoveStudioAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { assetId: string; folderId: string | null }) => moveStudioAsset({ data: input }),
    onSuccess: (result) => {
      if (result?.error) return toast.error(result.error)
      qc.invalidateQueries({ queryKey: ['media', 'assets'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not move asset'),
  })
}
