import type { SupabaseClient } from '@supabase/supabase-js'
import { embed } from '@/lib/embeddings'

export interface RetrievedChunk {
  content: string
  similarity: number
}

/**
 * Retrieve relevant chunks for a known owner.
 *
 * Callers have already authenticated/authorized the owner and pass their
 * request-scoped client. A cheap document-existence query runs first so users
 * without a ready knowledge base do not load the local ONNX embedding model.
 */
export async function retrieveContext(input: {
  query: string
  ownerId: string
  supabase: SupabaseClient
  agentId?: string
  matchCount?: number
}): Promise<RetrievedChunk[]> {
  const { query, ownerId, supabase, agentId, matchCount = 5 } = input
  if (!query.trim()) return []

  let readyDocuments = supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'ready')

  if (agentId) {
    readyDocuments = readyDocuments.or(
      `agent_id.eq.${agentId},agent_id.is.null`,
    )
  }

  const { count, error: readyError } = await readyDocuments
  if (readyError || !count) return []

  const queryEmbedding = await embed(query)
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_owner_id: ownerId,
    filter_agent_id: agentId ?? null,
  })

  if (error || !data) return []

  return (data as RetrievedChunk[])
    .filter((chunk) => chunk.similarity > 0.12)
    .sort((a, b) => b.similarity - a.similarity)
}
