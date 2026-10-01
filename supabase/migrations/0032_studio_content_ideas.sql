-- A content idea owns its brief; posts are channel-specific versions.
create table public.studio_content_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  brief text not null default '' check (char_length(brief) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index studio_content_ideas_owner_created_idx
  on public.studio_content_ideas (owner_id, created_at desc);
create trigger studio_content_ideas_updated_at before update on public.studio_content_ideas
  for each row execute function public.set_updated_at();

alter table public.studio_content_ideas enable row level security;
create policy "Content ideas: owner select" on public.studio_content_ideas
  for select to authenticated using (owner_id = auth.uid());
create policy "Content ideas: owner insert" on public.studio_content_ideas
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Content ideas: owner update" on public.studio_content_ideas
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.posts add column idea_id uuid references public.studio_content_ideas(id) on delete cascade;

-- Preserve all prior posts. UUIDs from posts are unique, so each starts as its
-- own idea until the owner adds another channel version.
insert into public.studio_content_ideas (id, owner_id, title, brief, created_at)
select post.id, post.owner_id,
  left(coalesce(nullif(trim(post.title), ''), 'Untitled idea'), 120),
  left(coalesce(nullif(trim(post.prompt), ''), post.caption, ''), 4000),
  post.created_at
from public.posts post;
update public.posts set idea_id = id;
alter table public.posts alter column idea_id set not null;
create index posts_idea_idx on public.posts (idea_id, created_at);
create unique index posts_one_channel_per_idea_idx on public.posts (idea_id, platform);

create function public.ensure_post_content_idea() returns trigger
language plpgsql set search_path = '' as $$
declare
  created_idea_id uuid;
begin
  if new.idea_id is null then
    insert into public.studio_content_ideas (owner_id, title, brief)
    values (
      new.owner_id,
      left(coalesce(nullif(trim(new.title), ''), 'Untitled idea'), 120),
      left(coalesce(nullif(trim(new.prompt), ''), new.caption, ''), 4000)
    ) returning id into created_idea_id;
    new.idea_id := created_idea_id;
  elsif not exists (
    select 1 from public.studio_content_ideas idea
    where idea.id = new.idea_id and idea.owner_id = new.owner_id
  ) then
    raise exception 'Content idea must belong to the post owner' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger posts_content_idea_insert before insert on public.posts
  for each row execute function public.ensure_post_content_idea();
create trigger posts_content_idea_update before update of idea_id on public.posts
  for each row execute function public.ensure_post_content_idea();
