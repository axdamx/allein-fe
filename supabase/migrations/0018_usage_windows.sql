-- ============================================================================
-- Migration 0018: Windowed usage counters (daily quota enforcement)
--
-- The lifetime counters on profiles (messages_count, etc.) are not enough to
-- enforce "X messages per day" quotas — they only go up. This migration adds
-- a per-user, per-metric, per-day counter and an atomic check-and-consume
-- function that prevents race conditions when many users (or one user with
-- many tabs) send messages concurrently.
--
-- The window_key is a DATE computed in the application layer using the user's
-- local timezone (Asia/Kuala_Lumpur), because Postgres cannot reliably derive
-- local-day from a timestamp without timezone extensions. The app passes the
-- already-resolved calendar date; this function just stores and checks it.
--
-- This table is the source of truth for windowed quota enforcement. The
-- lifetime *_count columns on profiles remain for dashboard analytics only.
-- ============================================================================

create table if not exists public.usage_windows (
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  metric     text   not null,            -- 'messages', 'whatsapp_messages', 'telegram_messages', 'posts', ...
  window_key date   not null,            -- the local calendar day, e.g. DATE '2026-07-05'
  count      int    not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, metric, window_key)
);

-- Fast lookup of a user's current-day usage for a metric.
create index if not exists usage_windows_user_metric_idx
  on public.usage_windows (user_id, metric, window_key desc);

-- ----------------------------------------------------------------------------
-- try_consume: atomically check the daily quota and increment the counter if
-- allowed. Returns whether the consume was permitted plus the new state.
--
-- Pass p_max = NULL for unlimited tiers (always allowed, still counted).
-- p_window_key is the local-time calendar date, computed by the caller.
-- ----------------------------------------------------------------------------
create or replace function public.try_consume(
  p_user_id    uuid,
  p_metric     text,
  p_max        int,                      -- NULL = unlimited (still counted)
  p_window_key date
) returns table(
  allowed    boolean,
  used       int,
  remaining  int,                        -- NULL when unlimited
  max_out    int,
  reset_at   timestamptz                 -- start of next local day, in UTC
)
language plpgsql
security definer set search_path = public
as $$
declare
  v_current int;
  v_new_count int;
begin
  -- Read current count for this window (0 if none yet).
  select coalesce(count, 0) into v_current
    from public.usage_windows
    where user_id = p_user_id
      and metric = p_metric
      and window_key = p_window_key
    for update;                           -- row lock: serialises concurrent consumers

  if v_current is null then
    v_current := 0;
  end if;

  -- Unlimited tier: always allow, still record usage for analytics.
  if p_max is null then
    insert into public.usage_windows (user_id, metric, window_key, count)
    values (p_user_id, p_metric, p_window_key, 1)
    on conflict (user_id, metric, window_key)
    do update set count = usage_windows.count + 1, updated_at = now();

    return query select
      true,
      v_current + 1,
      null::int,
      null::int,
      (p_window_key + 1)::timestamptz;
    return;
  end if;

  -- Cap reached: deny without incrementing.
  if v_current >= p_max then
    return query select
      false,
      v_current,
      0,
      p_max,
      (p_window_key + 1)::timestamptz;
    return;
  end if;

  -- Allowed: increment (upsert handles the first-of-day insert).
  v_new_count := v_current + 1;
  insert into public.usage_windows (user_id, metric, window_key, count)
  values (p_user_id, p_metric, p_window_key, v_new_count)
  on conflict (user_id, metric, window_key)
  do update set count = excluded.count, updated_at = now();

  return query select
    true,
    v_new_count,
    p_max - v_new_count,
    p_max,
    (p_window_key + 1)::timestamptz;
end;
$$;

-- ----------------------------------------------------------------------------
-- get_window_usage: read-only summary for a single window. Used by the plan
-- state builder to surface remaining quota to the UI without consuming.
-- ----------------------------------------------------------------------------
create or replace function public.get_window_usage(
  p_user_id    uuid,
  p_metric     text,
  p_window_key date
) returns table(used int)
language sql
security definer set search_path = public
as $$
  select coalesce(max(count), 0)::int
    from public.usage_windows
    where user_id = p_user_id
      and metric = p_metric
      and window_key = p_window_key;
$$;

grant execute on function public.try_consume(uuid, text, int, date) to authenticated;
grant execute on function public.get_window_usage(uuid, text, date) to authenticated;
