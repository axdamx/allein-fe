-- Organize account assets into folders and keep ordered image selections on posts.
create table public.studio_asset_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index studio_asset_folders_owner_name_idx
  on public.studio_asset_folders (owner_id, lower(name));
create index studio_asset_folders_owner_created_idx
  on public.studio_asset_folders (owner_id, created_at desc);
create trigger studio_asset_folders_updated_at before update on public.studio_asset_folders
  for each row execute function public.set_updated_at();

alter table public.studio_asset_folders enable row level security;
create policy "Asset folders: owner select" on public.studio_asset_folders
  for select to authenticated using (owner_id = auth.uid());
create policy "Asset folders: owner insert" on public.studio_asset_folders
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Asset folders: owner update" on public.studio_asset_folders
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Asset folders: owner delete" on public.studio_asset_folders
  for delete to authenticated using (owner_id = auth.uid());

alter table public.studio_assets
  add column collection_id uuid references public.studio_asset_folders(id) on delete set null;
create index studio_assets_collection_idx on public.studio_assets (owner_id, collection_id);

create function public.check_studio_asset_folder_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.collection_id is not null and not exists (
    select 1 from public.studio_asset_folders folder
    where folder.id = new.collection_id and folder.owner_id = new.owner_id
  ) then
    raise exception 'Asset folder must belong to the asset owner' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger studio_assets_folder_owner before insert or update of collection_id on public.studio_assets
  for each row execute function public.check_studio_asset_folder_owner();

alter table public.posts add column media_asset_ids uuid[] not null default '{}';
update public.posts post set media_asset_ids = array[asset.id]
from public.studio_assets asset
where post.media_url = asset.url
  and post.owner_id = asset.owner_id
  and post.media_type = 'image'
  and asset.kind = 'image' and asset.status = 'ready' and asset.storage_path is not null;

create function public.validate_post_media_assets() returns trigger
language plpgsql set search_path = '' as $$
declare
  expected_count int := cardinality(new.media_asset_ids);
  valid_count int;
  first_url text;
begin
  if expected_count > 10 or array_position(new.media_asset_ids, null) is not null then
    raise exception 'A post can contain up to 10 saved images' using errcode = '23514';
  end if;
  if expected_count > 0 then
    select count(distinct asset.id),
      (array_agg(asset.url order by selected.position))[1]
    into valid_count, first_url
    from unnest(new.media_asset_ids) with ordinality as selected(id, position)
    join public.studio_assets asset on asset.id = selected.id
    where asset.owner_id = new.owner_id and asset.kind = 'image'
      and asset.status = 'ready' and asset.storage_path is not null and asset.url is not null;
    if valid_count <> expected_count then
      raise exception 'Post images must be unique, ready, and owned by the post owner' using errcode = '23514';
    end if;
    new.media_url := first_url;
    new.media_type := case when expected_count = 1 then 'image' else 'carousel' end;
  else
    new.media_url := null;
    new.media_type := null;
  end if;
  return new;
end;
$$;
create trigger posts_media_assets_insert before insert on public.posts
  for each row execute function public.validate_post_media_assets();
create trigger posts_media_assets_update before update of media_asset_ids on public.posts
  for each row execute function public.validate_post_media_assets();

create function public.protect_post_media_asset() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- Account deletion cascades run through service role; do not block cleanup.
  if auth.role() = 'service_role' then
    return old;
  end if;
  if exists (
    select 1 from public.posts post
    where post.owner_id = old.owner_id
      and (old.id = any(post.media_asset_ids) or post.media_url = old.url)
  ) then
    raise exception 'Image is attached to a post' using errcode = '23503';
  end if;
  return old;
end;
$$;
create trigger studio_assets_protect_post_media before delete on public.studio_assets
  for each row execute function public.protect_post_media_asset();
