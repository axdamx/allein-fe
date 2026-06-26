create table if not exists public.calendar_events (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  location     text,
  start_date   date not null,
  end_date     date,
  all_day      boolean not null default true,
  source       text not null default 'ics',
  source_uid   text,
  imported_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "Users can view their own calendar events"
  on public.calendar_events for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own calendar events"
  on public.calendar_events for insert
  with check (auth.uid() = owner_id);

create policy "Users can delete their own calendar events"
  on public.calendar_events for delete
  using (auth.uid() = owner_id);

create index if not exists calendar_events_owner_date_idx
  on public.calendar_events(owner_id, start_date);
