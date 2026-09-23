import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listStudioContentIdeas, updateStudioContentIdea } from '@/server/studio-ideas'

export function useStudioContentIdeas() {
  return useQuery({
    queryKey: ['studio', 'content-ideas'],
    queryFn: () => listStudioContentIdeas(),
    staleTime: 20_000,
  })
}

export function useUpdateStudioContentIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; title: string; brief: string }) => updateStudioContentIdea({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) return toast.error(result.error)
      toast.success('Content idea updated')
      qc.invalidateQueries({ queryKey: ['studio', 'content-ideas'] })
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not update content idea'),
  })
}
