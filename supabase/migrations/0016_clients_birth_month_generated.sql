-- Generated columns for fast birthday month/day lookups
-- EXTRACT(MONTH FROM date_of_birth) can't use a simple B-tree index.
-- These stored generated columns turn month/day into direct column lookups.

alter table public.clients
  add column if not exists birth_month int
    generated always as (extract(month from date_of_birth)::int) stored;

alter table public.clients
  add column if not exists birth_day int
    generated always as (extract(day from date_of_birth)::int) stored;

-- Index on (owner_id, birth_month) for "birthdays in June" queries
-- Index on (owner_id, birth_day) for "birthdays today" queries
create index if not exists clients_owner_birth_month_idx
  on public.clients(owner_id, birth_month)
  where birth_month is not null;

create index if not exists clients_owner_birth_day_idx
  on public.clients(owner_id, birth_day)
  where birth_day is not null;

-- Update RPC function to use the generated column
create or replace function public.clients_by_birthday_month(
  p_owner_id uuid,
  p_month int
)
returns table(
  id uuid,
  name text,
  email text,
  phone text,
  company text,
  status public.client_status,
  date_of_birth date,
  created_at timestamptz
)
language sql
stable
as $$
  select cl.id, cl.name, cl.email, cl.phone, cl.company, cl.status, cl.date_of_birth, cl.created_at
  from public.clients cl
  where cl.owner_id = p_owner_id
    and cl.birth_month = p_month
  order by cl.name asc;
$$;
