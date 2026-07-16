-- ============================================================================
-- Migration 0026: Subscriptions + subscription events
--
-- Introduces a dedicated subscriptions table (one active row per user) and an
-- append-only subscription_events audit log. This supports the cancel-subscription
-- flow (self-serve + admin) on the current mock billing system, with columns
-- (stripe_customer_id, stripe_subscription_id, current_period_end,
-- cancel_at_period_end) chosen so Stripe can be wired in later without schema
-- changes. profiles.plan remains the denormalized cache all gating reads; this
-- table is the source of truth for subscription state.
--
-- RLS: users read their own rows; admins read all (via is_admin()); no client
-- writes — all mutations go through service-role/server functions. The pg_cron
-- sweep job lapses period-end cancellations (replaced later by the Stripe
-- customer.subscription.deleted webhook).
-- ============================================================================

-- --- Enums ------------------------------------------------------------------

do $$ begin
  create type subscription_status_enum as enum
    ('active','canceled_pending','canceled','past_due');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_event_type_enum as enum
    ('canceled','reactivated','immediate_downgrade','plan_changed');
exception when duplicate_object then null; end $$;

-- --- subscriptions table ----------------------------------------------------

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  status                 subscription_status_enum not null default 'active',
  plan_tier              plan_tier not null,
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  canceled_at            timestamptz,
  canceled_by            uuid references public.profiles(id) on delete set null,
  cancel_reason          text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One active subscription per user (active + canceled_pending + past_due).
create unique index if not exists subscriptions_one_active_per_user_idx
  on public.subscriptions (user_id)
  where status in ('active','canceled_pending','past_due');

create index if not exists subscriptions_status_period_end_idx
  on public.subscriptions (status, current_period_end);

-- --- subscription_events table (append-only audit log) ----------------------

create table if not exists public.subscription_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid not null references public.profiles(id) on delete set null,
  event_type   subscription_event_type_enum not null,
  reason       text,
  old_plan     plan_tier,
  new_plan     plan_tier,
  effective_at timestamptz not null default now(),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists subscription_events_user_created_idx
  on public.subscription_events (user_id, created_at desc);

-- --- updated_at trigger for subscriptions -----------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- --- RLS --------------------------------------------------------------------

alter table public.subscriptions enable row level security;

drop policy if exists "Subscriptions: owner select" on public.subscriptions;
create policy "Subscriptions: owner select"
  on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- No client INSERT/UPDATE/DELETE policies: all writes via service role.

alter table public.subscription_events enable row level security;

drop policy if exists "Subscription events: owner select" on public.subscription_events;
create policy "Subscription events: owner select"
  on public.subscription_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- --- Backfill: one active subscription row per existing paid user -----------

insert into public.subscriptions (user_id, status, plan_tier, current_period_end, cancel_at_period_end)
select id, 'active', plan, now() + interval '30 days', false
from public.profiles
where plan <> 'free'
  and not exists (
    select 1 from public.subscriptions s
    where s.user_id = profiles.id and s.status in ('active','canceled_pending','past_due')
  );

-- --- Period-end sweep (pg_cron) --------------------------------------------
-- Lapses subscriptions whose period has ended: flips profiles.plan -> 'free'
-- and subscription.status -> 'canceled'. Replaced later by the Stripe webhook.

create extension if not exists pg_cron with schema extensions;

create or replace function public.sweep_canceled_subscriptions()
returns void language plpgsql security definer set search_path = public as $$
declare
  rec record;
begin
  for rec in
    select s.id, s.user_id
    from public.subscriptions s
    where s.status = 'canceled_pending'
      and s.current_period_end is not null
      and s.current_period_end <= now()
  loop
    update public.profiles set plan = 'free' where id = rec.user_id and plan <> 'free';
    update public.subscriptions
      set status = 'canceled', canceled_at = coalesce(canceled_at, now())
      where id = rec.id;
    insert into public.subscription_events
      (user_id, actor_id, event_type, old_plan, new_plan, effective_at, reason, metadata)
    values (rec.user_id, rec.user_id, 'plan_changed', null, 'free', now(), null,
            jsonb_build_object('source', 'period_end_sweep'));
  end loop;
end; $$;

-- Schedule hourly if not already scheduled. cron.schedule lives in extensions schema.
do $$
declare
  job_id bigint;
begin
  select jobid into job_id from extensions.cron.job
    where jobname = 'sweep-canceled-subs' limit 1;
  if not found then
    perform extensions.cron.schedule(
      'sweep-canceled-subs',
      '0 * * * *',
      $$ select public.sweep_canceled_subscriptions(); $$
    );
  end if;
end; $$;
