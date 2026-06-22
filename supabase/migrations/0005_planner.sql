-- ============================================================================
-- Planner / Kanban — Tasks for day/week/month planning
-- ============================================================================

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  agent_id    uuid references public.agents(id) on delete set null,

  title       text not null,
  description text,
  status      task_status not null default 'todo',
  priority    task_priority not null default 'medium',

  -- Planning
  time_frame  text not null default 'day',   -- day | week | month | quarter
  planned_date date,                          -- which day this is planned for
  due_date    timestamptz,                    -- deadline

  sort_order  int not null default 0,
  tags        text[] not null default '{}',

  generated   boolean not null default false, -- true if AI-generated

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create index if not exists tasks_owner_idx on public.tasks(owner_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_planned_idx on public.tasks(planned_date);
create index if not exists tasks_agent_idx on public.tasks(agent_id);

alter table public.tasks enable row level security;

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (owner_id = auth.uid());

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (owner_id = auth.uid() or public.is_admin());
