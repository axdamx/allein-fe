/**
 * Public server functions for the RAG document pipeline.
 * Client-callable via RPC. Implementations live in documents.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

export interface DocumentRow {
  id: string
  owner_id: string
  agent_id: string | null
  client_id: string | null
  name: string
  mime_type: string | null
  size_bytes: number | null
  status: string
  chunk_count: number
  created_at: string
  updated_at: string
}

export const getDocuments = createServerFn({ method: 'GET' })
  .validator((d: { agentId?: string; clientId?: string }) => d)
  .handler(async ({ data }) => {
    const { getDocumentsImpl } = await import('./documents.server')
    return getDocumentsImpl(data.agentId, data.clientId)
  })

export const uploadDocument = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      name: string
      mimeType: string
      content: string
      isBase64?: boolean
      sizeBytes?: number
      agentId?: string
      clientId?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const { enforceLimitImpl } = await import('./profile.server')
    await enforceLimitImpl('documents')

    const { uploadDocumentImpl } = await import('./documents.server')
    return uploadDocumentImpl(data)
  })

export const deleteDocument = createServerFn({ method: 'POST' })
  .validator((d: { documentId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteDocumentImpl } = await import('./documents.server')
    return deleteDocumentImpl(data.documentId)
  })

export const getDocumentUrl = createServerFn({ method: 'GET' })
  .validator((d: { documentId: string }) => d)
  .handler(async ({ data }) => {
    const { getDocumentUrlImpl } = await import('./documents.server')
    return getDocumentUrlImpl(data.documentId)
  })
