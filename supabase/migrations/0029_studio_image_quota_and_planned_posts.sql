-- Monthly image attempts share the existing usage_windows table. The key is
-- the first day of the account's Malaysia calendar month.
create or replace function public.try_consume_monthly(
  p_user_id uuid,
  p_metric text,
  p_max int,
  p_window_key date
) returns table(
  allowed boolean,
  used int,
  remaining int,
  max_out int,
  reset_at timestamptz
)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_used int;
  v_reset_at timestamptz :=
    ((p_window_key + interval '1 month')::timestamp at time zone 'Asia/Kuala_Lumpur');
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if extract(day from p_window_key) <> 1 then
    raise exception 'monthly window must start on day one';
  end if;

  if p_max is not null and p_max <= 0 then
    return query select false, 0, 0, p_max, v_reset_at;
    return;
  end if;

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

revoke all on function public.try_consume_monthly(uuid, text, int, date)
  from public, anon, authenticated;
grant execute on function public.try_consume_monthly(uuid, text, int, date)
  to authenticated, service_role;

-- Previous "scheduled" rows had no publisher behind them. Keep the chosen
-- date, but mark them as ready drafts so the UI can accurately say "Planned".
update public.posts
set status = 'ready'
where status = 'scheduled' and published_at is null;

-- The composer already offers Telegram, but the original platform enum did
-- not include it, so saving those drafts failed.
alter type public.post_platform add value if not exists 'telegram';

create index if not exists posts_owner_planned_idx
  on public.posts (owner_id, scheduled_for)
  where scheduled_for is not null and published_at is null;
