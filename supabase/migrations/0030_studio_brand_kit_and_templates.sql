-- One brand kit per account; logos reuse durable Studio images.
create table if not exists public.studio_brand_kits (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  brand_name text not null default '',
  audience text not null default '',
  voice text not null default '',
  colors text[] not null default '{}',
  logo_asset_id uuid references public.studio_assets(id) on delete set null,
  default_hashtags text[] not null default '{}',
  disclaimer text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_brand_kits_name_length check (char_length(brand_name) <= 120),
  constraint studio_brand_kits_audience_length check (char_length(audience) <= 500),
  constraint studio_brand_kits_voice_length check (char_length(voice) <= 500),
  constraint studio_brand_kits_disclaimer_length check (char_length(disclaimer) <= 1000),
  constraint studio_brand_kits_colors_count check (cardinality(colors) <= 5),
  constraint studio_brand_kits_hashtags_count check (cardinality(default_hashtags) <= 15)
);

create trigger studio_brand_kits_updated_at before update on public.studio_brand_kits
  for each row execute function public.set_updated_at();

alter table public.studio_brand_kits enable row level security;
create policy "Brand kit: owner select" on public.studio_brand_kits
  for select to authenticated using (owner_id = auth.uid());
create policy "Brand kit: owner insert" on public.studio_brand_kits
  for insert to authenticated with check (
    owner_id = auth.uid() and (
      logo_asset_id is null or exists (
        select 1 from public.studio_assets assets
        where assets.id = logo_asset_id and assets.owner_id = auth.uid()
          and assets.kind = 'image' and assets.status = 'ready'
          and assets.storage_path is not null
      )
    )
  );
create policy "Brand kit: owner update" on public.studio_brand_kits
  for update to authenticated using (owner_id = auth.uid()) with check (
    owner_id = auth.uid() and (
      logo_asset_id is null or exists (
        select 1 from public.studio_assets assets
        where assets.id = logo_asset_id and assets.owner_id = auth.uid()
          and assets.kind = 'image' and assets.status = 'ready'
          and assets.storage_path is not null
      )
    )
  );

create table if not exists public.studio_post_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  prompt text not null,
  platform public.post_platform,
  tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studio_post_templates_name_length check (char_length(name) between 1 and 80),
  constraint studio_post_templates_prompt_length check (char_length(prompt) between 1 and 2000),
  constraint studio_post_templates_tone_length check (tone is null or char_length(tone) <= 80)
);

create index if not exists studio_post_templates_owner_updated_idx
  on public.studio_post_templates(owner_id, updated_at desc);
create trigger studio_post_templates_updated_at before update on public.studio_post_templates
  for each row execute function public.set_updated_at();

alter table public.studio_post_templates enable row level security;
create policy "Post templates: owner select" on public.studio_post_templates
  for select to authenticated using (owner_id = auth.uid());
create policy "Post templates: owner insert" on public.studio_post_templates
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Post templates: owner update" on public.studio_post_templates
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Post templates: owner delete" on public.studio_post_templates
  for delete to authenticated using (owner_id = auth.uid());
