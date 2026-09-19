-- ============================================================================
-- Stripe subscription billing foundation
-- ============================================================================
-- Stripe is authoritative for payment/subscription lifecycle. `profiles.plan`
-- remains the fast entitlement cache used by the existing server-side gates.

create table if not exists public.billing_customers (
  owner_id            uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id  text not null unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger billing_customers_updated_at
  before update on public.billing_customers
  for each row execute function public.set_updated_at();

create table if not exists public.billing_subscriptions (
  owner_id                  uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id        text not null references public.billing_customers(stripe_customer_id)
                            on update cascade on delete cascade,
  stripe_subscription_id    text not null unique,
  stripe_price_id           text not null,
  plan_tier                 public.plan_tier not null,
  status                    text not null check (
    status in (
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'paused',
      'trialing',
      'unpaid'
    )
  ),
  current_period_start      timestamptz,
  current_period_end        timestamptz,
  cancel_at_period_end      boolean not null default false,
  canceled_at               timestamptz,
  trial_end                 timestamptz,
  last_stripe_event_created bigint not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions(stripe_customer_id);
create index if not exists billing_subscriptions_status_period_idx
  on public.billing_subscriptions(status, current_period_end);

create trigger billing_subscriptions_updated_at
  before update on public.billing_subscriptions
  for each row execute function public.set_updated_at();

-- This table is both an idempotency ledger and a minimal operational audit
-- trail. Deliberately do not store full Stripe payloads (they can contain PII).
create table if not exists public.billing_webhook_events (
  stripe_event_id   text primary key,
  event_type        text not null,
  stripe_created_at bigint not null,
  status            text not null default 'processing'
                    check (status in ('processing', 'processed', 'failed')),
  error             text,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);

create index if not exists billing_webhook_events_status_idx
  on public.billing_webhook_events(status, received_at);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy "Users can read own billing customer"
  on public.billing_customers for select
  using (owner_id = (select auth.uid()));

create policy "Admins can read billing customers"
  on public.billing_customers for select
  using ((select public.is_admin()));

create policy "Users can read own subscription"
  on public.billing_subscriptions for select
  using (owner_id = (select auth.uid()));

create policy "Admins can read subscriptions"
  on public.billing_subscriptions for select
  using ((select public.is_admin()));

create policy "Admins can read webhook events"
  on public.billing_webhook_events for select
  using ((select public.is_admin()));

-- No INSERT/UPDATE/DELETE policies are created. Billing writes are restricted
-- to the trusted service-role client used by checkout and verified webhooks.

-- Atomically sync a Stripe subscription and the denormalized entitlement cache.
-- The event timestamp guard prevents delayed/out-of-order webhooks from
-- overwriting newer subscription state.
create or replace function public.sync_stripe_subscription(
  p_owner_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_plan public.plan_tier,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_canceled_at timestamptz,
  p_trial_end timestamptz,
  p_event_created bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer := 0;
  v_entitled boolean;
begin
  if p_status not in (
    'active', 'canceled', 'incomplete', 'incomplete_expired',
    'past_due', 'paused', 'trialing', 'unpaid'
  ) then
    raise exception 'Unsupported Stripe subscription status';
  end if;

  insert into public.billing_customers (owner_id, stripe_customer_id)
  values (p_owner_id, p_customer_id)
  on conflict (owner_id) do update
    set stripe_customer_id = excluded.stripe_customer_id;

  insert into public.billing_subscriptions (
    owner_id,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    plan_tier,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    trial_end,
    last_stripe_event_created
  ) values (
    p_owner_id,
    p_customer_id,
    p_subscription_id,
    p_price_id,
    p_plan,
    p_status,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_canceled_at,
    p_trial_end,
    p_event_created
  )
  on conflict (owner_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_price_id = excluded.stripe_price_id,
    plan_tier = excluded.plan_tier,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    canceled_at = excluded.canceled_at,
    trial_end = excluded.trial_end,
    last_stripe_event_created = excluded.last_stripe_event_created
  where excluded.last_stripe_event_created >=
        public.billing_subscriptions.last_stripe_event_created;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;

  -- Keep access during Stripe's automatic retry/dunning window. Checkout is
  -- never entitled while incomplete; unpaid/canceled/paused access is removed.
  v_entitled := p_status in ('active', 'trialing', 'past_due');

  update public.profiles
  set
    plan = case when v_entitled then p_plan else 'free'::public.plan_tier end,
    subscription_id = p_subscription_id,
    subscription_status = p_status,
    trial_ends_at = p_trial_end
  where id = p_owner_id;

  return true;
end;
$$;

revoke all on function public.sync_stripe_subscription(
  uuid, text, text, text, public.plan_tier, text, timestamptz, timestamptz,
  boolean, timestamptz, timestamptz, bigint
) from public, anon, authenticated;

grant execute on function public.sync_stripe_subscription(
  uuid, text, text, text, public.plan_tier, text, timestamptz, timestamptz,
  boolean, timestamptz, timestamptz, bigint
) to service_role;
