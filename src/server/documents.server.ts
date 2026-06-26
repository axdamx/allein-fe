/**
 * Server-only implementation for the RAG document pipeline.
 *
 * Handles: document upload → text extraction → chunking → embedding → storage
 * Plus: retrieval (semantic search) used at chat time.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { embed, embedBatch } from '@/lib/embeddings'
import { extractText, chunkText } from '@/lib/chunking'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentRow {
  id: string
  owner_id: string
  agent_id: string | null
  client_id: string | null
  name: string
  mime_type: string | null
  size_bytes: number | null
  storage_path: string | null
  status: string
  chunk_count: number
  created_at: string
  updated_at: string
}

export async function getDocumentUrlImpl(
  documentId: string,
): Promise<{ signed_url: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path, name')
    .eq('id', documentId)
    .eq('owner_id', user.id)
    .single()

  if (!doc?.storage_path) {
    return { error: 'Document not found or no storage path' }
  }

  const { data } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 3600)

  if (!data?.signedUrl) return { error: 'Failed to generate signed URL' }

  return { signed_url: data.signedUrl }
}

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export async function getDocumentsImpl(
  agentId?: string,
  clientId?: string,
): Promise<DocumentRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('documents')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (agentId) {
    query = query.or(`agent_id.eq.${agentId},agent_id.is.null`)
  }

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as unknown as DocumentRow[]
}

export async function deleteDocumentImpl(
  documentId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get the document to find its storage path
  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  // Delete from storage (best-effort)
  if (doc?.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path])
  }

  // Delete the document row (chunks cascade-delete via FK)
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) return { error: error.message }

  // Decrement usage counter
  await supabase.rpc('decrement_usage', {
    p_user_id: user.id,
    p_metric: 'documents_count',
    p_amount: 1,
  })

  return null
}

// ---------------------------------------------------------------------------
// Upload + Process Pipeline
// ---------------------------------------------------------------------------

export interface UploadDocumentInput {
  name: string
  mimeType: string
  /** File content: plain text for text files, base64 for binary (PDF). */
  content: string
  /** True when content is base64-encoded (binary files like PDF). */
  isBase64?: boolean
  sizeBytes?: number
  agentId?: string
  clientId?: string
}

/**
 * Update a document's status + chunk count so the UI can show progress.
 * We store the current processing step in the status field:
 *   processing → extracting → chunking → embedding → storing → ready
 */
async function updateDocStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  docId: string,
  status: string,
  chunkCount?: number,
) {
  const updates: Record<string, string | number> = { status }
  if (chunkCount !== undefined) updates.chunk_count = chunkCount
  await supabase.from('documents').update(updates).eq('id', docId)
}

/**
 * Upload + process a document through the full RAG pipeline:
 * 1. Create document row (status: processing)
 * 2. Extract text (PDF parsed via pdf-parse)
 * 3. Chunk text
 * 4. Embed all chunks (batch)
 * 5. Store chunks + vectors in document_chunks
 * 6. Update document status to ready
 *
 * The status field updates at each step so the UI can show live progress.
 */
export async function uploadDocumentImpl(
  input: UploadDocumentInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Create document row
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      owner_id: user.id,
      agent_id: input.agentId ?? null,
      client_id: input.clientId ?? null,
      name: input.name,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes ?? null,
      status: 'processing',
    })
    .select('id')
    .single()

  if (docError || !doc) {
    return { error: docError?.message ?? 'Failed to create document' }
  }

  // Increment usage counter
  await supabase.rpc('increment_usage', {
    p_user_id: user.id,
    p_metric: 'documents_count',
    p_amount: 1,
  })

  try {
    // 2. Extract text
    await updateDocStatus(supabase, doc.id, 'extracting')
    const text = await extractText(
      input.content,
      input.mimeType,
      input.isBase64,
    )

    if (!text.trim()) {
      await updateDocStatus(supabase, doc.id, 'failed')
      return { error: 'No text content found in document' }
    }

    // 3. Chunk text
    await updateDocStatus(supabase, doc.id, 'chunking')
    const chunks = chunkText(text)

    if (chunks.length === 0) {
      await updateDocStatus(supabase, doc.id, 'failed')
      return { error: 'Text chunking produced no chunks' }
    }

    // 4. Embed all chunks (batch for efficiency)
    await updateDocStatus(supabase, doc.id, 'embedding', chunks.length)
    const allEmbeddings: number[][] = []
    const batchSize = 20
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const embeddings = await embedBatch(batch)
      allEmbeddings.push(...embeddings)
    }

    // 5. Store chunks + vectors
    await updateDocStatus(supabase, doc.id, 'storing', chunks.length)
    const chunkRows = chunks.map((content, index) => ({
      document_id: doc.id,
      owner_id: user.id,
      content,
      chunk_index: index,
      embedding: allEmbeddings[index],
    }))

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkRows)

    if (chunksError) {
      throw new Error(`Failed to store chunks: ${chunksError.message}`)
    }

    // 6. Update document status
    await supabase
      .from('documents')
      .update({ status: 'ready', chunk_count: chunks.length })
      .eq('id', doc.id)

    return { id: doc.id }
  } catch (err) {
    // Mark document as failed
    await supabase
      .from('documents')
      .update({ status: 'failed' })
      .eq('id', doc.id)
    return {
      error: err instanceof Error ? err.message : 'Document processing failed',
    }
  }
}

// ---------------------------------------------------------------------------
// Retrieval — used at chat time to find relevant context
// ---------------------------------------------------------------------------

export interface RetrievedChunk {
  content: string
  similarity: number
}

/**
 * Search the user's documents for chunks relevant to a query.
 * Uses pgvector cosine similarity via the match_documents RPC.
 *
 * @param query The user's question
 * @param agentId Optional: restrict to documents linked to this agent
 * @param matchCount How many chunks to retrieve (default 5)
 */
export async function retrieveContext(
  query: string,
  agentId?: string,
  matchCount = 5,
): Promise<RetrievedChunk[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Embed the query using the same model as the documents
  const queryEmbedding = await embed(query)

  // Search pgvector for similar chunks
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_owner_id: user.id,
    filter_agent_id: agentId ?? null,
  })

  if (error || !data) return []

  // Only return chunks above a similarity threshold.
  // MiniLM (384-dim) produces lower similarity scores than larger models,
  // so we use a lower threshold (0.12). Even weak matches can contain the
  // answer — the LLM decides whether to use the context or ignore it.
  return (data as RetrievedChunk[])
    .filter((c) => c.similarity > 0.12)
    .sort((a, b) => b.similarity - a.similarity)
}
