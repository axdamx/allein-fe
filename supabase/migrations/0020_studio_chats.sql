-- Studio chat: conversations + messages for the conversational image/video studio.
--
-- Kept separate from the CRM `conversations`/`messages` tables so the studio
-- can carry media-specific fields (attachment URLs, generated asset ids) without
-- polluting the agent-chat schema. Messages are flat text rows; media generated
-- by tool calls is linked via `asset_id` → `studio_assets.id`.

create table if not exists public.studio_chats (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'New studio chat',
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists studio_chats_owner_updated_idx
  on public.studio_chats (owner_id, updated_at desc);

create table if not exists public.studio_messages (
  id             uuid primary key default gen_random_uuid(),
  chat_id        uuid not null references public.studio_chats(id) on delete cascade,
  role           text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content        text not null default '',
  -- For user messages with an uploaded image, or assistant messages that produced media.
  attachment_url text,
  asset_id       uuid references public.studio_assets(id) on delete set null,
  -- Tool call summary JSON: [{ name, success, message, assetId? }]
  tool_calls     jsonb default '[]'::jsonb,
  model          text,
  tokens_in      integer,
  tokens_out     integer,
  created_at     timestamptz not null default now()
);

create index if not exists studio_messages_chat_created_idx
  on public.studio_messages (chat_id, created_at asc);

-- ---------------------------------------------------------------------------
-- Triggers: maintain updated_at on chats when messages arrive
-- ---------------------------------------------------------------------------
create or replace function public.touch_studio_chat()
returns trigger language plpgsql as $$
begin
  update public.studio_chats set updated_at = now() where id = new.chat_id;
  return new;
end;
$$;

drop trigger if exists studio_messages_touch_chat on public.studio_messages;
create trigger studio_messages_touch_chat
  after insert on public.studio_messages
  for each row execute function public.touch_studio_chat();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.studio_chats enable row level security;
alter table public.studio_messages enable row level security;

drop policy if exists "Studio chats: owner select" on public.studio_chats;
create policy "Studio chats: owner select"
  on public.studio_chats for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Studio chats: owner insert" on public.studio_chats;
create policy "Studio chats: owner insert"
  on public.studio_chats for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Studio chats: owner update" on public.studio_chats;
create policy "Studio chats: owner update"
  on public.studio_chats for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Studio chats: owner delete" on public.studio_chats;
create policy "Studio chats: owner delete"
  on public.studio_chats for delete to authenticated
  using (owner_id = auth.uid());

-- Messages: access via chat ownership (join through studio_chats).
drop policy if exists "Studio messages: owner select" on public.studio_messages;
create policy "Studio messages: owner select"
  on public.studio_messages for select to authenticated
  using (
    exists (
      select 1 from public.studio_chats c
      where c.id = studio_messages.chat_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Studio messages: owner insert" on public.studio_messages;
create policy "Studio messages: owner insert"
  on public.studio_messages for insert to authenticated
  with check (
    exists (
      select 1 from public.studio_chats c
      where c.id = studio_messages.chat_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Studio messages: owner delete" on public.studio_messages;
create policy "Studio messages: owner delete"
  on public.studio_messages for delete to authenticated
  using (
    exists (
      select 1 from public.studio_chats c
      where c.id = studio_messages.chat_id and c.owner_id = auth.uid()
    )
  );
