-- Clients table for managing existing customer records
create type public.client_status as enum (
  'active',
  'inactive',
  'churned'
);

create table public.clients (
  id              uuid primary key default uuid_generate_v4(),
  owner_id        uuid not null references public.profiles(id),
  name            text not null,
  email           text,
  phone           text,
  company         text,
  website         text,
  industry        text,
  status          client_status not null default 'active',
  notes           text,
  tags            text[] not null default '{}',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.clients enable row level security;

create policy "Users can view their own clients"
  on public.clients for select
  using (owner_id = auth.uid());

create policy "Users can insert their own clients"
  on public.clients for insert
  with check (owner_id = auth.uid());

create policy "Users can update their own clients"
  on public.clients for update
  using (owner_id = auth.uid());

create policy "Users can delete their own clients"
  on public.clients for delete
  using (owner_id = auth.uid());

-- Triggers
create trigger set_updated_at_clients
  before update on public.clients
  for each row execute function public.set_updated_at();
