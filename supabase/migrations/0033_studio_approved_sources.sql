-- User-curated facts for public social content. CRM contact details and raw
-- knowledge documents are never sent to the post generator implicitly.
create table public.studio_approved_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('listing', 'crm', 'knowledge')),
  title text not null check (char_length(title) between 1 and 120),
  facts text not null check (char_length(facts) between 1 and 4000),
  reference_url text check (reference_url is null or char_length(reference_url) <= 500),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index studio_approved_sources_owner_idx
  on public.studio_approved_sources (owner_id, created_at desc);
create trigger studio_approved_sources_updated_at before update on public.studio_approved_sources
  for each row execute function public.set_updated_at();

alter table public.studio_approved_sources enable row level security;
create policy "Studio sources: owner select" on public.studio_approved_sources
  for select to authenticated using (owner_id = auth.uid());
create policy "Studio sources: owner insert" on public.studio_approved_sources
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Studio sources: owner update" on public.studio_approved_sources
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Studio sources: owner delete" on public.studio_approved_sources
  for delete to authenticated using (owner_id = auth.uid());
