-- ============================================================================
-- Migration 0004: Switch vector dimension to 384 (local MiniLM embeddings)
-- ============================================================================
-- We use Xenova/all-MiniLM-L6-v2 for local, free embeddings (384 dims).
-- This migration drops the 1536-dim column and recreates it at 384.

-- Drop the existing vector column + index
drop index if exists public.chunks_embedding_idx;
alter table public.document_chunks drop column if exists embedding;

-- Recreate at 384 dimensions
alter table public.document_chunks add column embedding vector(384);

-- Recreate HNSW index for fast cosine similarity search
create index if not exists chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- Update match_documents to use 384 dims
drop function if exists public.match_documents(vector, int, uuid);
create or replace function public.match_documents(
  query_embedding vector(384),
  match_count int default 5,
  filter_owner_id uuid default null,
  filter_agent_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where (filter_owner_id is null or dc.owner_id = filter_owner_id)
    and (
      filter_agent_id is null
      or exists (
        select 1 from public.documents d
        where d.id = dc.document_id
          and (d.agent_id = filter_agent_id or d.agent_id is null)
      )
    )
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_documents(vector(384), int, uuid, uuid) to authenticated;
