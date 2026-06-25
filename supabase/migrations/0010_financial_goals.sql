-- ============================================================================
-- Financial Goals — user-defined monetary targets with progress tracking
-- ============================================================================

do $$ begin
  create type goal_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_category as enum (
    'savings',
    'investment',
    'revenue',
    'debt_payoff',
    'custom'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.financial_goals (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,

  title         text not null,
  description   text,
  category      goal_category not null default 'custom',
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0 check (current_amount >= 0),
  currency      text not null default 'USD',

  -- Timeframe
  timeframe     text not null default '1y',   -- 1m, 3m, 6m, 1y, 2y, 5y
  deadline      date,                          -- optional specific target date

  status        goal_status not null default 'active',
  sort_order    int not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger financial_goals_updated_at before update on public.financial_goals
  for each row execute function public.set_updated_at();

create index if not exists financial_goals_owner_idx on public.financial_goals(owner_id);
create index if not exists financial_goals_status_idx on public.financial_goals(status);

alter table public.financial_goals enable row level security;

drop policy if exists "financial_goals_select" on public.financial_goals;
create policy "financial_goals_select" on public.financial_goals
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "financial_goals_insert" on public.financial_goals;
create policy "financial_goals_insert" on public.financial_goals
  for insert with check (owner_id = auth.uid());

drop policy if exists "financial_goals_update" on public.financial_goals;
create policy "financial_goals_update" on public.financial_goals
  for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "financial_goals_delete" on public.financial_goals;
create policy "financial_goals_delete" on public.financial_goals
  for delete using (owner_id = auth.uid() or public.is_admin());
