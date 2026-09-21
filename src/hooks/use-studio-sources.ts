import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteStudioSource, listStudioSources, saveStudioSource } from '@/server/studio-sources'

export function useStudioSources() {
  return useQuery({ queryKey: ['studio', 'sources'], queryFn: () => listStudioSources(), staleTime: 30_000 })
}

export function useSaveStudioSource() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id?: string; kind: 'listing' | 'crm' | 'knowledge'; title: string; facts: string; referenceUrl?: string; approved: boolean
    }) => saveStudioSource({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) return toast.error(result.error)
      toast.success('Source saved')
      client.invalidateQueries({ queryKey: ['studio', 'sources'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save source'),
  })
}

export function useDeleteStudioSource() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteStudioSource({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) return toast.error(result.error)
      toast.success('Source deleted')
      client.invalidateQueries({ queryKey: ['studio', 'sources'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not delete source'),
  })
}
