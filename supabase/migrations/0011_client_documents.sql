-- ============================================================================
-- Migration 0011: Link documents to clients
-- ============================================================================

alter table public.documents add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists documents_client_idx on public.documents(client_id);
