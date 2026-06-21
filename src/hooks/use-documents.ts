import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  type DocumentRow,
} from '@/server/documents'

export function useDocuments(agentId?: string) {
  return useQuery({
    queryKey: ['documents', agentId],
    queryFn: () => getDocuments({ data: { agentId } }),
    staleTime: 15 * 1000,
    // Poll frequently while any document is processing
    refetchInterval: (query) => {
      const docs = query.state.data
      const hasProcessing = docs?.some(
        (d) =>
          d.status === 'processing' ||
          d.status === 'extracting' ||
          d.status === 'chunking' ||
          d.status === 'embedding' ||
          d.status === 'storing',
      )
      return hasProcessing ? 1500 : false
    },
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      name: string
      mimeType: string
      content: string
      isBase64?: boolean
      sizeBytes?: number
      agentId?: string
    }) => uploadDocument({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Document processed and ready for RAG')
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error(msg)
    },
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (documentId: string) =>
      deleteDocument({ data: { documentId } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Document deleted')
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
    },
  })
}

export type { DocumentRow }
