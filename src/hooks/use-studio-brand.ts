import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  deleteStudioPostTemplate,
  getStudioBrandKit,
  listStudioPostTemplates,
  saveStudioBrandKit,
  saveStudioPostTemplate,
  type SaveBrandKitInput,
  type SaveTemplateInput,
} from '@/server/studio-brand'

export function useStudioBrandKit() {
  return useQuery({
    queryKey: ['studio', 'brand-kit'],
    queryFn: () => getStudioBrandKit(),
    staleTime: 60_000,
  })
}

export function useSaveStudioBrandKit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveBrandKitInput) => saveStudioBrandKit({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Brand kit saved')
      qc.setQueryData(['studio', 'brand-kit'], result)
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save brand kit'),
  })
}

export function useStudioPostTemplates() {
  return useQuery({
    queryKey: ['studio', 'post-templates'],
    queryFn: () => listStudioPostTemplates(),
    staleTime: 30_000,
  })
}

export function useSaveStudioPostTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveTemplateInput) => saveStudioPostTemplate({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Template saved')
      qc.invalidateQueries({ queryKey: ['studio', 'post-templates'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save template'),
  })
}

export function useDeleteStudioPostTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStudioPostTemplate({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Template deleted')
      qc.invalidateQueries({ queryKey: ['studio', 'post-templates'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not delete template'),
  })
}
