-- Studio media assets (AI-generated images & videos).
--
-- Tracks every image/video generated in the Marketing Studio so users get
-- a persistent library, the chat agent can reference prior outputs, and the
-- storyboard can attach scenes to assets. Generation is gated by plan feature
-- flags (aiImageGen / aiVideoGen), so no separate usage counter is needed here.

create table if not exists public.studio_assets (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  kind            text not null check (kind in ('image', 'video')),
  prompt          text not null,
  provider        text not null default 'zai',
  provider_model  text,
  provider_id     text,                           -- ZAI task/job id (video async)
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'ready', 'failed')),
  storage_path    text,                           -- path in the 'media' bucket
  url             text,                           -- signed/public URL (or remote URL)
  aspect_ratio    text,
  duration_ms     integer,                        -- video duration (null for images)
  error           text,
  meta            jsonb default '{}'::jsonb,      -- provider extras (size, seed, etc.)
  reference_id    uuid references public.studio_assets(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists studio_assets_owner_created_idx
  on public.studio_assets (owner_id, created_at desc);

-- Updated-at trigger (matches pattern used elsewhere in the schema).
create or replace function public.set_studio_asset_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists studio_assets_updated_at on public.studio_assets;
create trigger studio_assets_updated_at
  before update on public.studio_assets
  for each row execute function public.set_studio_asset_updated_at();

-- Row-level security: users only see/manage their own assets.
alter table public.studio_assets enable row level security;

drop policy if exists "Studio assets: owner select" on public.studio_assets;
create policy "Studio assets: owner select"
  on public.studio_assets for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Studio assets: owner insert" on public.studio_assets;
create policy "Studio assets: owner insert"
  on public.studio_assets for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Studio assets: owner update" on public.studio_assets;
create policy "Studio assets: owner update"
  on public.studio_assets for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Studio assets: owner delete" on public.studio_assets;
create policy "Studio assets: owner delete"
  on public.studio_assets for delete
  to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket for generated media (public-read for display, per-user write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600, -- 100 MB (videos can be large)
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- Media is public-read so generated assets can be displayed / shared without
-- signed URLs. Writes/deletes stay per-user.
drop policy if exists "Public can read media bucket" on storage.objects;
create policy "Public can read media bucket"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'media');

drop policy if exists "Users can upload to own media folder" on storage.objects;
create policy "Users can upload to own media folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own media files" on storage.objects;
create policy "Users can delete own media files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
