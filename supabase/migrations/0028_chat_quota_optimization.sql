-- ============================================================================
-- Migration 0028: Race-safe chat quotas and consolidated usage reads
-- ============================================================================

-- Quota counters may only be changed through SECURITY DEFINER functions.
drop policy if exists "Usage windows: owner update" on public.usage_windows;
revoke insert, update, delete, truncate on public.usage_windows
  from anon, authenticated;

create or replace function public.try_consume(
  p_user_id    uuid,
  p_metric     text,
  p_max        int,
  p_window_key date
) returns table(
  allowed    boolean,
  used       int,
  remaining  int,
  max_out    int,
  reset_at   timestamptz
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_used int;
  v_reset_at timestamptz :=
    ((p_window_key + 1)::timestamp at time zone 'Asia/Kuala_Lumpur');
begin
  -- Browser callers may only consume their own quota. Webhook workers use the
  -- service role and may consume the owning account's quota explicitly.
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if p_max is not null and p_max <= 0 then
    return query select false, 0, 0, p_max, v_reset_at;
    return;
  end if;

  -- The unique key serialises both first-use inserts and subsequent updates.
  -- The WHERE predicate makes check + increment one atomic statement.
  insert into public.usage_windows as windows
    (user_id, metric, window_key, count)
  values
    (p_user_id, p_metric, p_window_key, 1)
  on conflict (user_id, metric, window_key)
  do update set
    count = windows.count + 1,
    updated_at = now()
  where p_max is null or windows.count < p_max
  returning count into v_used;

  if v_used is null then
    select windows.count into v_used
      from public.usage_windows as windows
      where windows.user_id = p_user_id
        and windows.metric = p_metric
        and windows.window_key = p_window_key;

    return query select false, coalesce(v_used, 0), 0, p_max, v_reset_at;
    return;
  end if;

  return query select
    true,
    v_used,
    case when p_max is null then null::int else greatest(0, p_max - v_used) end,
    p_max,
    v_reset_at;
end;
$$;

create or replace function public.get_window_usage(
  p_user_id    uuid,
  p_metric     text,
  p_window_key date
) returns table(used int)
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
    select coalesce(max(windows.count), 0)::int
      from public.usage_windows as windows
      where windows.user_id = p_user_id
        and windows.metric = p_metric
        and windows.window_key = p_window_key;
end;
$$;

create or replace function public.get_window_usage_all(
  p_user_id    uuid,
  p_window_key date
) returns table(metric text, used int)
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
    select windows.metric, windows.count::int
      from public.usage_windows as windows
      where windows.user_id = p_user_id
        and windows.window_key = p_window_key;
end;
$$;

revoke all on function public.try_consume(uuid, text, int, date)
  from public, anon, authenticated;
revoke all on function public.get_window_usage(uuid, text, date)
  from public, anon, authenticated;
revoke all on function public.get_window_usage_all(uuid, date)
  from public, anon, authenticated;

grant execute on function public.try_consume(uuid, text, int, date)
  to authenticated, service_role;
grant execute on function public.get_window_usage(uuid, text, date)
  to authenticated, service_role;
grant execute on function public.get_window_usage_all(uuid, date)
  to authenticated, service_role;
