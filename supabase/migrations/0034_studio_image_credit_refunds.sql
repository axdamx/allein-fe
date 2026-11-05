-- Track each image quota reservation so failed generations can return one
-- credit exactly once. Keep this ledger after asset deletion for auditability.
create table if not exists public.studio_image_credit_reservations (
  asset_id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  window_key date not null,
  charged boolean not null,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists studio_image_credit_reservations_owner_idx
  on public.studio_image_credit_reservations (owner_id, window_key desc);

alter table public.studio_image_credit_reservations enable row level security;
revoke all on public.studio_image_credit_reservations from public, anon, authenticated;

-- Called only by server code after inserting a processing asset. The existing
-- monthly quota RPC and reservation insert share one database transaction.
create or replace function public.reserve_studio_image_credit(
  p_owner_id uuid,
  p_asset_id uuid,
  p_max int,
  p_window_key date,
  p_bypass boolean default false
) returns table (
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
  v_quota record;
  v_reset_at timestamptz :=
    ((p_window_key + interval '1 month')::timestamp at time zone 'Asia/Kuala_Lumpur');
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if extract(day from p_window_key) <> 1 then
    raise exception 'monthly window must start on day one';
  end if;

  perform 1 from public.studio_assets
    where id = p_asset_id and owner_id = p_owner_id
      and kind = 'image' and status = 'processing'
    for update;
  if not found then
    raise exception 'processing image asset not found';
  end if;

  if exists (select 1 from public.studio_image_credit_reservations
             where asset_id = p_asset_id) then
    raise exception 'image credit already reserved';
  end if;

  if p_bypass then
    insert into public.studio_image_credit_reservations
      (asset_id, owner_id, window_key, charged)
    values (p_asset_id, p_owner_id, p_window_key, false);
    return query select true, 0, null::int, null::int, v_reset_at;
    return;
  end if;

  select * into v_quota from public.try_consume_monthly(
    p_owner_id, 'image_gen', p_max, p_window_key
  );
  if v_quota.allowed then
    insert into public.studio_image_credit_reservations
      (asset_id, owner_id, window_key, charged)
    values (p_asset_id, p_owner_id, p_window_key, true);
  end if;

  return query select v_quota.allowed, v_quota.used, v_quota.remaining,
    v_quota.max_out, v_quota.reset_at;
end;
$$;

revoke all on function public.reserve_studio_image_credit(uuid, uuid, int, date, boolean)
  from public, anon, authenticated;
grant execute on function public.reserve_studio_image_credit(uuid, uuid, int, date, boolean)
  to service_role;

-- A failed image may be refunded once. A ready asset blocks a refund, even if
-- the caller lost the response after the database commit.
create or replace function public.refund_studio_image_credit(p_asset_id uuid)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  v_reservation public.studio_image_credit_reservations%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into v_reservation
    from public.studio_image_credit_reservations
    where asset_id = p_asset_id
    for update;
  if not found or not v_reservation.charged or v_reservation.refunded_at is not null then
    return false;
  end if;

  if exists (select 1 from public.studio_assets
             where id = p_asset_id and status = 'ready'
               and url is not null and storage_path is not null) then
    return false;
  end if;

  update public.usage_windows
    set count = count - 1, updated_at = now()
    where user_id = v_reservation.owner_id
      and metric = 'image_gen'
      and window_key = v_reservation.window_key
      and count > 0;
  if not found then
    raise exception 'image usage window missing or empty';
  end if;

  update public.studio_image_credit_reservations
    set refunded_at = now()
    where asset_id = p_asset_id;
  return true;
end;
$$;

revoke all on function public.refund_studio_image_credit(uuid)
  from public, anon, authenticated;
grant execute on function public.refund_studio_image_credit(uuid)
  to service_role;
