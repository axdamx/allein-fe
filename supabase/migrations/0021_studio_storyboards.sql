-- Storyboards: ordered sequences of scenes for video/reel planning.
--
-- A storyboard belongs to a user, has a brief (the high-level goal), and
-- contains scenes positioned by `position` (drag-reorder in the UI). Each
-- scene points at a `studio_assets` row for its visual + carries a caption and
-- a duration. Scenes can be generated from the studio agent or built manually.

create table if not exists public.studio_storyboards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Untitled storyboard',
  brief       text,
  -- Overall intended duration in ms (sum of scene durations is a hint, not enforced)
  duration_ms integer,
  aspect_ratio text default '16:9',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists studio_storyboards_owner_idx
  on public.studio_storyboards (owner_id, updated_at desc);

create table if not exists public.studio_scenes (
  id             uuid primary key default gen_random_uuid(),
  storyboard_id  uuid not null references public.studio_storyboards(id) on delete cascade,
  position       integer not null default 0,
  asset_id       uuid references public.studio_assets(id) on delete set null,
  -- Cached thumbnail/url so the scene renders even before/without an asset row
  image_url      text,
  caption        text not null default '',
  -- Per-scene prompt used to (re)generate the visual
  prompt         text,
  duration_ms    integer not null default 2000,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists studio_scenes_storyboard_position_idx
  on public.studio_scenes (storyboard_id, position asc);

-- Unique position per storyboard prevents collisions during reorder.
create unique index if not exists studio_scenes_position_uniq
  on public.studio_scenes (storyboard_id, position);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_studio_storyboard()
returns trigger language plpgsql as $$
begin
  update public.studio_storyboards set updated_at = now() where id = new.storyboard_id;
  return new;
end;
$$;

drop trigger if exists studio_scenes_touch_storyboard on public.studio_scenes;
create trigger studio_scenes_touch_storyboard
  after insert or update on public.studio_scenes
  for each row execute function public.touch_studio_storyboard();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.studio_storyboards enable row level security;
alter table public.studio_scenes enable row level security;

drop policy if exists "Studio storyboards: owner select" on public.studio_storyboards;
create policy "Studio storyboards: owner select"
  on public.studio_storyboards for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Studio storyboards: owner insert" on public.studio_storyboards;
create policy "Studio storyboards: owner insert"
  on public.studio_storyboards for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Studio storyboards: owner update" on public.studio_storyboards;
create policy "Studio storyboards: owner update"
  on public.studio_storyboards for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Studio storyboards: owner delete" on public.studio_storyboards;
create policy "Studio storyboards: owner delete"
  on public.studio_storyboards for delete to authenticated
  using (owner_id = auth.uid());

-- Scenes: access via storyboard ownership.
drop policy if exists "Studio scenes: owner select" on public.studio_scenes;
create policy "Studio scenes: owner select"
  on public.studio_scenes for select to authenticated
  using (
    exists (
      select 1 from public.studio_storyboards s
      where s.id = studio_scenes.storyboard_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Studio scenes: owner insert" on public.studio_scenes;
create policy "Studio scenes: owner insert"
  on public.studio_scenes for insert to authenticated
  with check (
    exists (
      select 1 from public.studio_storyboards s
      where s.id = studio_scenes.storyboard_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Studio scenes: owner update" on public.studio_scenes;
create policy "Studio scenes: owner update"
  on public.studio_scenes for update to authenticated
  using (
    exists (
      select 1 from public.studio_storyboards s
      where s.id = studio_scenes.storyboard_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.studio_storyboards s
      where s.id = studio_scenes.storyboard_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Studio scenes: owner delete" on public.studio_scenes;
create policy "Studio scenes: owner delete"
  on public.studio_scenes for delete to authenticated
  using (
    exists (
      select 1 from public.studio_storyboards s
      where s.id = studio_scenes.storyboard_id and s.owner_id = auth.uid()
    )
  );

-- Convenience RPC: shift positions after a reorder so the client can send a
-- simple ordered list of scene ids and have the server normalize positions.
create or replace function public.reorder_studio_scenes(
  p_storyboard_id uuid,
  p_scene_ids uuid[]
) returns void language plpgsql security definer as $$
declare
  i integer := 0;
  sid uuid;
begin
  foreach sid in array p_scene_ids loop
    update public.studio_scenes set position = i where id = sid;
    i := i + 1;
  end loop;
end;
$$;

grant execute on function public.reorder_studio_scenes(uuid, uuid[]) to authenticated;
