# Cancel Subscription Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cancel-subscription flow for the existing mock billing system — self-serve (user → Settings) and admin-initiated (admin → Users tab) — with period-end (default) and immediate cancel options, reactivation, an audit log, and a period-end sweep. Stripe-ready: server signatures are chosen so Stripe wires in later as a drop-in.

**Architecture:** Two new Postgres tables (`subscriptions`, `subscription_events`) hold subscription state and an append-only audit log. `profiles.plan` remains the denormalized gating cache that all enforcement reads; the cancel flow updates both tables and flips `profiles.plan` when a change takes effect. New server functions (`src/server/subscriptions.ts` + `.server.ts`) follow the existing `createServerFn` pair convention. New React Query hooks + dialog/banner components wire the UI. A `pg_cron` job lapses period-end cancels (replaced later by the Stripe webhook).

**Tech Stack:** TanStack Start (`createServerFn`), Supabase (Postgres + RLS + `pg_cron`), React Query, shadcn/ui (Radix via `radix-ui` umbrella) + Tailwind v4, `sonner` toasts.

---

## Important: no test framework

**This codebase has no test infrastructure** (no vitest/jest/playwright, no `test` script, no `*.test.ts` files). This plan does **not** introduce one. Instead, the verification gate for every task is:

```
npm run build
```

`build` runs `vite build && tsc --noEmit`, so it type-checks the whole project. **Run `npm run build` after every task that touches TS;** treat type errors as test failures. Manual runtime verification (dev server click-through) is called out explicitly where needed.

Do not add `// @ts-ignore`, `// @ts-expect-error`, or `any` to make the build pass — fix the root cause. The codebase is strict-mode TS with `verbatimModuleSyntax` (use `import type` for type-only imports).

---

## File Structure

**Create:**
- `supabase/migrations/0026_subscriptions.sql` — schema: 2 enums, 2 tables, RLS, indexes, backfill, pg_cron sweep.
- `src/lib/subscriptions.ts` — shared TypeScript types (`SubscriptionStatus`, `SubscriptionEventType`, `SubscriptionState`, input types).
- `src/server/subscriptions.server.ts` — impls: `getSubscriptionStateImpl`, `cancelSubscriptionImpl`, `reactivateSubscriptionImpl`, `adminGetUserSubscriptionImpl`, plus module-private `requireUser`, `requireAdminOrSelf`.
- `src/server/subscriptions.ts` — RPC wrappers: `getSubscriptionState`, `cancelSubscription`, `reactivateSubscription`, `adminGetUserSubscription`.
- `src/hooks/use-subscriptions.ts` — React Query hooks: `useSubscriptionState`, `useCancelSubscription`, `useReactivateSubscription`, `useAdminCancelSubscription`.
- `src/components/billing/cancel-subscription-dialog.tsx` — self-serve cancel dialog.
- `src/components/billing/subscription-status-banner.tsx` — "ends on {{date}}" / reactivate banner.
- `src/components/billing/admin-cancel-dialog.tsx` — admin cancel dialog (required reason).

**Modify:**
- `src/components/settings/plan-tab.tsx` — render banner + cancel button; fetch subscription state.
- `src/routes/_authed.admin.tsx` — per-row "Cancel subscription" action in the Users tab.

---

## Task 1: Migration — tables, enums, RLS, indexes

**Files:**
- Create: `supabase/migrations/0026_subscriptions.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0026_subscriptions.sql`:

```sql
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
```

- [ ] **Step 2: Verify the migration applies**

Run against your local Supabase:
```
supabase db reset      # if running locally with the CLI
```
Or, if you apply migrations manually, run the file against the dev database. Expected: no errors. Verify the tables exist:
```sql
\d public.subscriptions
\d public.subscription_events
select count(*) from public.subscriptions;  -- should equal count of paid users
select jobname, schedule from extensions.cron.job where jobname = 'sweep-canceled-subs';
```

If `create extension pg_cron` fails with "pg_cron can only be loaded via shared_preload_libraries", enable it in Supabase Dashboard → Database → Settings (`track_io_started` / `shared_preload_libraries`) or via `supabase/config.toml` and retry. If pg_cron cannot be enabled in your environment, comment out the `create extension` + schedule block and note that the app-level fallback (Task 6) applies.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0026_subscriptions.sql
git commit -m "feat(subscriptions): add subscriptions + events tables with pg_cron sweep"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/lib/subscriptions.ts`

- [ ] **Step 1: Write the types file**

Create `src/lib/subscriptions.ts`:

```ts
import type { PlanTier } from '@/lib/plans'

/** Mirrors subscription_status_enum, plus 'none' for no subscription row. */
export type SubscriptionStatus =
  | 'active'
  | 'canceled_pending'
  | 'canceled'
  | 'past_due'
  | 'none'

export type SubscriptionEventType =
  | 'canceled'
  | 'reactivated'
  | 'immediate_downgrade'
  | 'plan_changed'

/** What a subscriptions row looks like to the client (subset of columns). */
export interface SubscriptionRecord {
  id: string
  status: Exclude<SubscriptionStatus, 'none'>
  plan_tier: PlanTier
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  cancel_reason: string | null
}

/** Return type of getSubscriptionState — has derived flags for UI. */
export interface SubscriptionState {
  status: SubscriptionStatus
  plan: PlanTier
  subscription: SubscriptionRecord | null
  isCanceledPending: boolean
  isCanceled: boolean
  daysUntilPeriodEnd: number | null
}

export interface CancelSubscriptionInput {
  /** When omitted or equal to caller, cancels caller's own subscription (self-serve). */
  targetUserId?: string
  immediate: boolean
  reason?: string
}

export interface ReactivateSubscriptionInput {
  targetUserId?: string
}

export interface AdminUserSubscriptionResult {
  subscription: SubscriptionRecord | null
  recentEvents: Array<{
    id: string
    event_type: SubscriptionEventType
    reason: string | null
    old_plan: PlanTier | null
    new_plan: PlanTier | null
    effective_at: string
    created_at: string
  }>
}

/** Standard mutation result shape used across the codebase (see _errors.ts). */
export type MutationResult = { error: string } | null
```

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS (build + `tsc --noEmit`). A standalone types file adds nothing to the bundle; it should compile cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/subscriptions.ts
git commit -m "feat(subscriptions): shared types"
```

---

## Task 3: Server impl — auth helpers + getSubscriptionState

**Files:**
- Create: `src/server/subscriptions.server.ts` (partial — extended in later tasks)

This task creates the impl file with the two auth helpers and the read function. Later tasks add cancel/reactivate/admin.

- [ ] **Step 1: Write the impl file (auth helpers + read fn)**

Create `src/server/subscriptions.server.ts`:

```ts
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { safeError, sanitizeSupabaseMessage } from '@/server/_errors'
import type { PlanTier } from '@/lib/plans'
import type {
  SubscriptionRecord,
  SubscriptionState,
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
  AdminUserSubscriptionResult,
  MutationResult,
} from '@/lib/subscriptions'

/** Resolve the caller. Throws (caught by callers) if not authenticated. */
async function requireUser() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

/** Require that the caller is an admin OR acting on their own account.
 *  Returns the caller + the target user id (resolved to caller for self-serve). */
async function requireAdminOrSelf(targetUserId?: string) {
  const { supabase, user } = await requireUser()

  if (!targetUserId || targetUserId === user.id) {
    return { supabase, caller: user, targetUserId: user.id, isAdmin: false }
  }

  // Acting on another user — require admin.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
    throw new Error('Admin access required')
  }
  return { supabase, caller: user, targetUserId, isAdmin: true }
}

function toSubscriptionRecord(row: Record<string, unknown> | null): SubscriptionRecord | null {
  if (!row) return null
  return {
    id: row.id as string,
    status: row.status as SubscriptionRecord['status'],
    plan_tier: row.plan_tier as PlanTier,
    current_period_end: row.current_period_end as string | null,
    cancel_at_period_end: row.cancel_at_period_end as boolean,
    canceled_at: row.canceled_at as string | null,
    cancel_reason: row.cancel_reason as string | null,
  }
}

function computeDaysUntil(periodEnd: string | null): number | null {
  if (!periodEnd) return null
  const ms = new Date(periodEnd).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export async function getSubscriptionStateImpl(): Promise<SubscriptionState> {
  try {
    const { supabase, user } = await requireUser()

    const [{ data: profile }, { data: subRow }] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user.id).single(),
      supabase
        .from('subscriptions')
        .select(
          'id, status, plan_tier, current_period_end, cancel_at_period_end, canceled_at, cancel_reason',
        )
        .eq('user_id', user.id)
        .in('status', ['active', 'canceled_pending', 'past_due'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const plan = (profile?.plan ?? 'free') as PlanTier
    const subscription = toSubscriptionRecord(subRow as Record<string, unknown> | null)

    if (!subscription) {
      return {
        status: 'none',
        plan,
        subscription: null,
        isCanceledPending: false,
        isCanceled: false,
        daysUntilPeriodEnd: null,
      }
    }

    return {
      status: subscription.status as SubscriptionState['status'],
      plan,
      subscription,
      isCanceledPending: subscription.status === 'canceled_pending',
      isCanceled: subscription.status === 'canceled',
      daysUntilPeriodEnd: computeDaysUntil(subscription.current_period_end),
    }
  } catch (err) {
    // Read fns in this codebase degrade to a safe default rather than throwing.
    return {
      status: 'none',
      plan: 'free',
      subscription: null,
      isCanceledPending: false,
      isCanceled: false,
      daysUntilPeriodEnd: null,
    }
  }
}
```

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS. (Unused imports like `CancelSubscriptionInput` are used in later tasks — leave them; TS won't error on unused *type* imports under `verbatimModuleSyntax` as long as they're exported/used across the module boundary. If the linter complains, temporarily comment them — they'll be used in Tasks 4–6.)

If `eslint .` flags unused type imports, remove the unused ones now and re-add them in the task that uses them. Keep the build green.

- [ ] **Step 3: Commit**

```bash
git add src/server/subscriptions.server.ts
git commit -m "feat(subscriptions): server impl — auth helpers + getSubscriptionState"
```

---

## Task 4: Server impl — cancelSubscription

**Files:**
- Modify: `src/server/subscriptions.server.ts` (append `cancelSubscriptionImpl`)

- [ ] **Step 1: Append the cancel impl**

Add to `src/server/subscriptions.server.ts` (after `getSubscriptionStateImpl`):

```ts
export async function cancelSubscriptionImpl(
  input: CancelSubscriptionInput,
): Promise<MutationResult> {
  try {
    const { supabase, caller, targetUserId, isAdmin } = await requireAdminOrSelf(
      input.targetUserId,
    )

    // Owner self-protection: an admin cannot cancel another admin/owner's sub.
    if (isAdmin) {
      const { data: target } = await supabase
        .from('profiles')
        .select('role, plan')
        .eq('id', targetUserId)
        .single()
      if (!target) return { error: 'User not found' }
      if (target.role === 'owner' || target.role === 'admin') {
        return { error: 'Cannot cancel an admin or owner subscription' }
      }
      if (target.plan === 'free') return { error: 'User is already on the Free plan' }
    }

    // Load the active subscription row.
    const { data: sub, error: loadErr } = await supabase
      .from('subscriptions')
      .select('id, status, plan_tier, current_period_end')
      .eq('user_id', targetUserId)
      .in('status', ['active', 'canceled_pending', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loadErr) return { error: sanitizeSupabaseMessage(loadErr.message, 'Failed to load subscription') }

    if (!sub) {
      // No subscription row. If the user is on a paid plan, synthesize one; else bail.
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', targetUserId)
        .single()
      if (!profile || profile.plan === 'free') {
        return { error: 'No active subscription to cancel' }
      }
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: created, error: createErr } = await supabase
        .from('subscriptions')
        .insert({
          user_id: targetUserId,
          status: 'active',
          plan_tier: profile.plan,
          current_period_end: periodEnd,
          cancel_at_period_end: false,
        })
        .select('id, plan_tier, current_period_end')
        .single()
      if (createErr || !created) {
        return { error: sanitizeSupabaseMessage(createErr?.message ?? 'Failed to create subscription', 'Operation failed') }
      }
      return runCancel(supabase, {
        subId: created.id,
        userId: targetUserId,
        oldPlan: created.plan_tier,
        currentPeriodEnd: created.current_period_end as string | null,
        immediate: input.immediate,
        reason: input.reason,
        actorId: caller.id,
      })
    }

    if (sub.status === 'canceled') return { error: 'Subscription is already canceled' }

    return runCancel(supabase, {
      subId: sub.id,
      userId: targetUserId,
      oldPlan: sub.plan_tier as PlanTier,
      currentPeriodEnd: sub.current_period_end as string | null,
      immediate: input.immediate,
      reason: input.reason,
      actorId: caller.id,
    })
  } catch (err) {
    return { error: safeError(err, 'Failed to cancel subscription') }
  }
}

/** Shared write step for cancel (used for both pre-existing and synthesized rows). */
async function runCancel(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  args: {
    subId: string
    userId: string
    oldPlan: PlanTier
    currentPeriodEnd: string | null
    immediate: boolean
    reason?: string
    actorId: string
  },
): Promise<MutationResult> {
  const effectiveAt = new Date().toISOString()
  const newPeriodEnd =
    args.immediate || !args.currentPeriodEnd
      ? args.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : args.currentPeriodEnd

  const { error: subErr } = await supabase
    .from('subscriptions')
    .update({
      status: args.immediate ? 'canceled' : 'canceled_pending',
      cancel_at_period_end: !args.immediate,
      canceled_at: effectiveAt,
      canceled_by: args.actorId,
      cancel_reason: args.reason ?? null,
      current_period_end: newPeriodEnd,
    })
    .eq('id', args.subId)
  if (subErr) return { error: sanitizeSupabaseMessage(subErr.message, 'Failed to cancel subscription') }

  // Flip plan immediately only for immediate cancel.
  if (args.immediate) {
    const { error: planErr } = await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('id', args.userId)
    if (planErr) return { error: sanitizeSupabaseMessage(planErr.message, 'Failed to update plan') }
  }

  const { error: evErr } = await supabase.from('subscription_events').insert({
    user_id: args.userId,
    actor_id: args.actorId,
    event_type: args.immediate ? 'immediate_downgrade' : 'canceled',
    reason: args.reason ?? null,
    old_plan: args.oldPlan,
    new_plan: args.immediate ? 'free' : args.oldPlan,
    effective_at: effectiveAt,
    metadata: { immediate: args.immediate },
  })
  if (evErr) return { error: sanitizeSupabaseMessage(evErr.message, 'Failed to log event') }

  return null
}
```

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/server/subscriptions.server.ts
git commit -m "feat(subscriptions): cancelSubscription impl (self-serve + admin)"
```

---

## Task 5: Server impl — reactivate + adminGetUserSubscription

**Files:**
- Modify: `src/server/subscriptions.server.ts` (append two fns)

- [ ] **Step 1: Append reactivate + admin-read impls**

Add to `src/server/subscriptions.server.ts`:

```ts
export async function reactivateSubscriptionImpl(
  input: ReactivateSubscriptionInput,
): Promise<MutationResult> {
  try {
    const { supabase, caller, targetUserId } = await requireAdminOrSelf(input.targetUserId)

    const { data: sub, error: loadErr } = await supabase
      .from('subscriptions')
      .select('id, status, plan_tier')
      .eq('user_id', targetUserId)
      .in('status', ['active', 'canceled_pending', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (loadErr) return { error: sanitizeSupabaseMessage(loadErr.message, 'Failed to load subscription') }
    if (!sub) return { error: 'No subscription found' }
    if (sub.status !== 'canceled_pending') {
      return { error: 'Only a pending cancellation can be reactivated' }
    }

    const { error: updErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        canceled_by: null,
        cancel_reason: null,
      })
      .eq('id', sub.id)
    if (updErr) return { error: sanitizeSupabaseMessage(updErr.message, 'Failed to reactivate') }

    const { error: evErr } = await supabase.from('subscription_events').insert({
      user_id: targetUserId,
      actor_id: caller.id,
      event_type: 'reactivated',
      old_plan: sub.plan_tier,
      new_plan: sub.plan_tier,
      effective_at: new Date().toISOString(),
      metadata: { immediate: false },
    })
    if (evErr) return { error: sanitizeSupabaseMessage(evErr.message, 'Failed to log event') }

    return null
  } catch (err) {
    return { error: safeError(err, 'Failed to reactivate subscription') }
  }
}

export async function adminGetUserSubscriptionImpl(input: {
  userId: string
}): Promise<AdminUserSubscriptionResult | { error: string }> {
  try {
    const { supabase, user } = await requireUser()
    const { data: caller } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
      return { error: 'Admin access required' }
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select(
        'id, status, plan_tier, current_period_end, cancel_at_period_end, canceled_at, cancel_reason',
      )
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: events } = await supabase
      .from('subscription_events')
      .select('id, event_type, reason, old_plan, new_plan, effective_at, created_at')
      .eq('user_id', input.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    return {
      subscription: toSubscriptionRecord(sub as Record<string, unknown> | null),
      recentEvents: (events ?? []) as AdminUserSubscriptionResult['recentEvents'],
    }
  } catch (err) {
    return { error: safeError(err, 'Failed to load subscription') }
  }
}
```

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/server/subscriptions.server.ts
git commit -m "feat(subscriptions): reactivate + adminGetUserSubscription impls"
```

---

## Task 6: Server RPC wrappers

**Files:**
- Create: `src/server/subscriptions.ts`

- [ ] **Step 1: Write the RPC file**

Create `src/server/subscriptions.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'

export type {
  SubscriptionStatus,
  SubscriptionEventType,
  SubscriptionRecord,
  SubscriptionState,
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
  AdminUserSubscriptionResult,
  MutationResult,
} from '@/lib/subscriptions'

import type {
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
} from '@/lib/subscriptions'

export const getSubscriptionState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSubscriptionStateImpl } = await import('./subscriptions.server')
    return getSubscriptionStateImpl()
  },
)

export const cancelSubscription = createServerFn({ method: 'POST' })
  .validator((d: CancelSubscriptionInput) => d)
  .handler(async ({ data }) => {
    const { cancelSubscriptionImpl } = await import('./subscriptions.server')
    return cancelSubscriptionImpl(data)
  })

export const reactivateSubscription = createServerFn({ method: 'POST' })
  .validator((d: ReactivateSubscriptionInput) => d)
  .handler(async ({ data }) => {
    const { reactivateSubscriptionImpl } = await import('./subscriptions.server')
    return reactivateSubscriptionImpl(data)
  })

export const adminGetUserSubscription = createServerFn({ method: 'POST' })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { adminGetUserSubscriptionImpl } = await import('./subscriptions.server')
    return adminGetUserSubscriptionImpl(data)
  })
```

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/server/subscriptions.ts
git commit -m "feat(subscriptions): RPC wrappers"
```

---

## Task 7: React Query hooks

**Files:**
- Create: `src/hooks/use-subscriptions.ts`

- [ ] **Step 1: Write the hooks file**

Create `src/hooks/use-subscriptions.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSubscriptionState,
  cancelSubscription,
  reactivateSubscription,
} from '@/server/subscriptions'
import type {
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
} from '@/lib/subscriptions'

const SUB_KEY = ['subscription-state'] as const

export function useSubscriptionState() {
  return useQuery({
    queryKey: SUB_KEY,
    queryFn: () => getSubscriptionState(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/** Invalidate everything a subscription change can affect. */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: SUB_KEY })
  qc.invalidateQueries({ queryKey: ['plan-state'] })
  qc.invalidateQueries({ queryKey: ['profile'] })
  qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  qc.invalidateQueries({ queryKey: ['admin', 'billing'] })
}

/** Self-serve or admin cancel. Caller is responsible for UX text. */
export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CancelSubscriptionInput) =>
      cancelSubscription({ data: input }),
    onSuccess: (result, input) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        input.immediate
          ? 'Subscription canceled — your plan is now Free.'
          : 'Subscription scheduled to cancel at period end.',
      )
      invalidateAll(qc)
    },
  })
}

export function useReactivateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReactivateSubscriptionInput) =>
      reactivateSubscription({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Subscription reactivated.')
      invalidateAll(qc)
    },
  })
}

/** Admin cancel — same mutation, separate hook for clarity at call sites. */
export function useAdminCancelSubscription() {
  return useCancelSubscription()
}
```

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-subscriptions.ts
git commit -m "feat(subscriptions): react-query hooks"
```

---

## Task 8: Subscription status banner component

**Files:**
- Create: `src/components/billing/subscription-status-banner.tsx`

- [ ] **Step 1: Write the banner**

Create `src/components/billing/subscription-status-banner.tsx`:

```tsx
import { format } from 'date-fns'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReactivateSubscription } from '@/hooks/use-subscriptions'
import type { SubscriptionRecord } from '@/lib/subscriptions'

export function SubscriptionStatusBanner({
  subscription,
}: {
  subscription: SubscriptionRecord
}) {
  const reactivate = useReactivateSubscription()

  const periodEnd = subscription.current_period_end
    ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
    : 'the end of your billing period'

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Your subscription ends on {periodEnd}
          </p>
          <p className="text-xs text-muted-foreground">
            You'll keep your current features until then, then move to the Free plan.
          </p>
        </div>
        {subscription.status === 'canceled_pending' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reactivate.mutate({})}
            disabled={reactivate.isPending}
          >
            <RotateCcw className="size-4" />
            Reactivate
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

Note: `date-fns` is already a dependency (used in the admin route). If `format` import resolves, it's present. If `npm run build` fails on the import, run `npm install date-fns` first.

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/billing/subscription-status-banner.tsx
git commit -m "feat(subscriptions): status banner with reactivate"
```

---

## Task 9: Self-serve cancel dialog component

**Files:**
- Create: `src/components/billing/cancel-subscription-dialog.tsx`

- [ ] **Step 1: Write the dialog**

Create `src/components/billing/cancel-subscription-dialog.tsx`:

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PLAN_CONFIGS } from '@/lib/plans'
import { useCancelSubscription } from '@/hooks/use-subscriptions'
import type { PlanTier } from '@/lib/plans'

const REASONS = [
  'Too expensive',
  'Not enough features',
  'Switching to alternative',
  'Other',
] as const

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  currentPlan,
  currentPeriodEnd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanTier
  currentPeriodEnd: string | null
}) {
  const [reason, setReason] = useState<string>('')
  const [immediate, setImmediate] = useState(false)
  const cancel = useCancelSubscription()

  const periodEndLabel = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), 'MMM d, yyyy')
    : 'the end of your billing period'

  function handleConfirm() {
    cancel.mutate(
      { immediate, reason: reason || undefined },
      {
        onSuccess: (result) => {
          if (!result?.error) onOpenChange(false)
        },
      },
    )
  }

  const planLabel = PLAN_CONFIGS[currentPlan]?.label ?? 'your'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel your {planLabel} subscription</DialogTitle>
          <DialogDescription>
            {immediate
              ? 'Your access will end immediately and your account will move to the Free plan.'
              : `You'll keep your ${planLabel} features until ${periodEndLabel}, then your account will move to the Free plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-xs text-muted-foreground">
              Reason (optional)
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="cancel-immediate" className="text-sm font-medium">
                Cancel now instead
              </Label>
              <p className="text-xs text-muted-foreground">
                End access immediately instead of waiting until {periodEndLabel}.
              </p>
            </div>
            <Switch id="cancel-immediate" checked={immediate} onCheckedChange={setImmediate} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep my plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? 'Canceling…' : 'Confirm cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Notes:
- Verify these ui primitives exist before writing: `@/components/ui/label`, `@/components/ui/switch`. If they don't, add them via shadcn: `npx shadcn@latest add label switch` (the codebase uses the `new-york` style — it's already configured).
- The Dialog/Select/Button primitives already exist (used in `upgrade-modal.tsx` and `plan-tab.tsx`).

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS. If it fails on missing `@/components/ui/label` or `switch`, add them via shadcn and re-run.

- [ ] **Step 3: Commit**

```bash
git add src/components/billing/cancel-subscription-dialog.tsx
git add src/components/ui/label.tsx src/components/ui/switch.tsx 2>/dev/null || true
git commit -m "feat(subscriptions): self-serve cancel dialog"
```

---

## Task 10: Wire self-serve cancel into Plan & Billing tab

**Files:**
- Modify: `src/components/settings/plan-tab.tsx`

- [ ] **Step 1: Read the current file**

Read `src/components/settings/plan-tab.tsx` in full to see its exact current state. (It will be used as the reference for the edit below.)

- [ ] **Step 2: Add imports**

At the top of `src/components/settings/plan-tab.tsx`, add to the existing import block:

```ts
import { useState } from 'react'
import { useSubscriptionState } from '@/hooks/use-subscriptions'
import { CancelSubscriptionDialog } from '@/components/billing/cancel-subscription-dialog'
import { SubscriptionStatusBanner } from '@/components/billing/subscription-status-banner'
```

- [ ] **Step 3: Fetch subscription state and add the cancel button + banner + dialog**

Inside the `PlanTab` component body (after the existing `changePlan` mutation definition), add:

```tsx
const [cancelOpen, setCancelOpen] = useState(false)
const subState = useSubscriptionState()
const subscription = subState.data?.subscription
const showCancel =
  currentPlan !== 'free' && !subState.data?.isCanceledPending
const showBanner = !!subscription && subState.data?.isCanceledPending === true
```

Then, inside the rendered `<CardContent className="space-y-3">`, **after** the `PLAN_ORDER.map(...)` block and still inside `<CardContent>`, append:

```tsx
{showBanner && subscription && <SubscriptionStatusBanner subscription={subscription} />}

{showCancel && (
  <div className="flex justify-end pt-2">
    <Button
      variant="link"
      size="sm"
      className="text-muted-foreground hover:text-destructive"
      onClick={() => setCancelOpen(true)}
    >
      Cancel subscription
    </Button>
  </div>
)}

<CancelSubscriptionDialog
  open={cancelOpen}
  onOpenChange={setCancelOpen}
  currentPlan={currentPlan}
  currentPeriodEnd={subscription?.current_period_end ?? null}
/>
```

If the card currently has no closing `</CardContent>` after the map, place the new block right before the existing `</CardContent>`. Verify the JSX nesting compiles.

- [ ] **Step 4: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 5: Manual verify**

Run `npm run dev`, sign in as a non-free user, open Settings → Plan & Billing:
- Free user: no cancel button, no banner.
- Paid, active: "Cancel subscription" link visible at the bottom of the card.
- Click it → dialog opens with period-end text, reason dropdown, "Cancel now instead" switch.
- Confirm with the switch off → banner appears ("ends on {date}") with Reactivate. Plan badge still shows paid tier.
- Click Reactivate → banner disappears.
- Confirm with the switch on → plan flips to Free immediately; plan cards show Free as current.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/plan-tab.tsx
git commit -m "feat(subscriptions): wire self-serve cancel into Plan & Billing tab"
```

---

## Task 11: Admin cancel dialog component

**Files:**
- Create: `src/components/billing/admin-cancel-dialog.tsx`

- [ ] **Step 1: Write the admin dialog**

Create `src/components/billing/admin-cancel-dialog.tsx`:

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAdminCancelSubscription } from '@/hooks/use-subscriptions'
import { PLAN_CONFIGS } from '@/lib/plans'
import type { PlanTier } from '@/lib/plans'

export function AdminCancelDialog({
  open,
  onOpenChange,
  user,
  currentPlan,
  currentPeriodEnd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; email: string }
  currentPlan: PlanTier
  currentPeriodEnd: string | null
}) {
  const [reason, setReason] = useState('')
  const [immediate, setImmediate] = useState(false)
  const cancel = useAdminCancelSubscription()

  const periodEndLabel = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), 'MMM d, yyyy')
    : 'the end of the billing period'

  const reasonInvalid = reason.trim().length < 3

  function handleConfirm() {
    if (reasonInvalid) return
    cancel.mutate(
      { targetUserId: user.id, immediate, reason: reason.trim() },
      {
        onSuccess: (result) => {
          if (!result?.error) onOpenChange(false)
        },
      },
    )
  }

  const planLabel = PLAN_CONFIGS[currentPlan]?.label ?? 'current'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel subscription for {user.email}</DialogTitle>
          <DialogDescription>
            Currently on the {planLabel} plan. This action is logged with your admin identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="admin-cancel-reason" className="text-xs text-muted-foreground">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="admin-cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this subscription being canceled?"
              rows={3}
            />
            {reason.length > 0 && reasonInvalid && (
              <p className="text-xs text-destructive">Reason must be at least 3 characters.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Timing</Label>
            <RadioGroup
              value={immediate ? 'immediate' : 'period_end'}
              onValueChange={(v) => setImmediate(v === 'immediate')}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="period_end" id="t-period" />
                <Label htmlFor="t-period" className="text-sm font-normal">
                  At period end ({periodEndLabel})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="immediate" id="t-immediate" />
                <Label htmlFor="t-immediate" className="text-sm font-normal">
                  Immediately — drop to Free now
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancel.isPending || reasonInvalid}
          >
            {cancel.isPending ? 'Canceling…' : 'Confirm cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Notes:
- Verify these ui primitives exist first: `@/components/ui/textarea`, `@/components/ui/radio-group`. If missing, `npx shadcn@latest add textarea radio-group`.

- [ ] **Step 2: Typecheck**

```
npm run build
```
Expected: PASS. Add missing ui primitives via shadcn if needed.

- [ ] **Step 3: Commit**

```bash
git add src/components/billing/admin-cancel-dialog.tsx
git add src/components/ui/textarea.tsx src/components/ui/radio-group.tsx 2>/dev/null || true
git commit -m "feat(subscriptions): admin cancel dialog with required reason"
```

---

## Task 12: Wire admin cancel into Users tab

**Files:**
- Modify: `src/routes/_authed.admin.tsx`

- [ ] **Step 1: Read the current Users tab section**

Read `src/routes/_authed.admin.tsx` lines 250-375 to see the exact current row JSX. The existing structure (per the exploration) is a `<div className="divide-y">` inside `<CardContent className="p-0">`, each row a `<div className="flex items-center gap-3 px-4 py-3">` with role + plan `<Select>`s trailing.

- [ ] **Step 2: Add imports**

At the top of `src/routes/_authed.admin.tsx`, add:

```ts
import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AdminCancelDialog } from '@/components/billing/admin-cancel-dialog'
```

Note: `Button`, `Dialog`, `lucide-react`, and `useState` may already be imported — check first and only add what's missing. `@/components/ui/dropdown-menu` may need to be added via `npx shadcn@latest add dropdown-menu`.

- [ ] **Step 3: Add per-row cancel state**

Inside the admin page component (near the existing `useAdminUsers`/`updateRole`/`updatePlan` declarations), add:

```tsx
const [cancelTarget, setCancelTarget] = useState<{
  id: string
  email: string
  plan: PlanTier
  currentPeriodEnd: string | null
} | null>(null)
```

If `PlanTier` isn't already imported in this file, add `import type { PlanTier } from '@/lib/plans'`.

- [ ] **Step 4: Add the actions menu to each user row**

Inside the user-row `<div className="flex items-center gap-3 px-4 py-3">`, **after the plan `<Select>` block**, add a trailing actions menu. The plan selector is the last existing element in the row; this goes after it:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="size-8" disabled={u.plan === 'free'}>
      <MoreVertical className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem
      disabled={u.plan === 'free'}
      onSelect={() =>
        setCancelTarget({
          id: u.id,
          email: u.email,
          plan: u.plan as PlanTier,
          currentPeriodEnd: null,
        })
      }
    >
      Cancel subscription
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Note: `u.plan` must be available on the user row object fetched by `getAdminUsers`. Verify the select list in `src/server/admin.server.ts` includes `plan` (it does — see the Users tab reference). `currentPeriodEnd` is intentionally `null` in this first pass: the dialog copy falls back to "the end of the billing period", and the admin's choice still works (period-end vs immediate is decided by the `immediate` flag, not by the displayed date). Wiring the authoritative `current_period_end` from `adminGetUserSubscription` (built in Task 5) into the dialog is an optional enhancement — left out of the first pass to keep the Users-tab wiring simple. If you want it, call `adminGetUserSubscription({ data: { userId: u.id } })` when opening the dialog and feed the result into `cancelTarget.currentPeriodEnd`.

- [ ] **Step 5: Render the dialog**

After the user list `<CardContent>`, render the dialog controlled by `cancelTarget`:

```tsx
<Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
  {cancelTarget && (
    <AdminCancelDialog
      open
      onOpenChange={(o) => !o && setCancelTarget(null)}
      user={{ id: cancelTarget.id, email: cancelTarget.email }}
      currentPlan={cancelTarget.plan}
      currentPeriodEnd={cancelTarget.currentPeriodEnd}
    />
  )}
</Dialog>
```

Note: `AdminCancelDialog` already wraps its own `<Dialog>`. If nesting Dialog inside Dialog causes a Radix warning, instead render `{cancelTarget && <AdminCancelDialog open onOpenChange={...} ... />}` directly (no outer Dialog wrapper) — that is the cleaner pattern and should be preferred. Use that form:

```tsx
{cancelTarget && (
  <AdminCancelDialog
    open
    onOpenChange={(o) => !o && setCancelTarget(null)}
    user={{ id: cancelTarget.id, email: cancelTarget.email }}
    currentPlan={cancelTarget.plan}
    currentPeriodEnd={cancelTarget.currentPeriodEnd}
  />
)}
```

and drop the unused `Dialog` import.

- [ ] **Step 6: Typecheck**

```
npm run build
```
Expected: PASS. If `@/components/ui/dropdown-menu` is missing, `npx shadcn@latest add dropdown-menu` and re-run.

- [ ] **Step 7: Manual verify**

Run `npm run dev`. As an admin (set your `profiles.role` to `admin` or `owner` in the DB), open the admin dashboard → Users tab:
- For a free user: the kebab button is disabled.
- For a paid user: kebab opens a menu with "Cancel subscription".
- Click it → admin dialog opens with required reason (submit disabled until ≥3 chars), timing radio.
- Submit with "At period end" → toast "scheduled to cancel"; the user's row still shows their plan (period-end hasn't lapsed).
- Submit with "Immediately" → the user's plan selector flips to Free.
- Try to cancel an owner/admin → toast error "Cannot cancel an admin or owner subscription".

- [ ] **Step 8: Commit**

```bash
git add src/routes/_authed.admin.tsx
git add src/components/ui/dropdown-menu.tsx 2>/dev/null || true
git commit -m "feat(subscriptions): admin cancel subscription in Users tab"
```

---

## Task 13 (fallback only): App-level sweep if pg_cron unavailable

**Skip this task if Task 1's `create extension pg_cron` succeeded and the scheduled job exists.** Only do this task if pg_cron could not be enabled in your environment.

**Files:**
- Modify: `src/server/subscriptions.server.ts`
- Modify: `src/server/subscriptions.ts`

- [ ] **Step 1: Add a sweep impl**

Append to `src/server/subscriptions.server.ts`:

```ts
/** App-level fallback for the pg_cron sweep. Call lazily from getSubscriptionStateImpl.
 *  Only runs if pg_cron is unavailable in the environment. */
export async function sweepExpiredCancellationsImpl(): Promise<void> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: expired } = await supabase
      .from('subscriptions')
      .select('id, user_id')
      .eq('status', 'canceled_pending')
      .not('current_period_end', 'is', null)
      .lte('current_period_end', new Date().toISOString())

    for (const row of expired ?? []) {
      await supabase.from('profiles').update({ plan: 'free' }).eq('id', row.user_id).neq('plan', 'free')
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('id', row.id)
      await supabase.from('subscription_events').insert({
        user_id: row.user_id,
        actor_id: row.user_id,
        event_type: 'plan_changed',
        new_plan: 'free',
        effective_at: new Date().toISOString(),
        metadata: { source: 'app_level_sweep' },
      })
    }
  } catch {
    // Non-fatal — sweep is best-effort.
  }
}
```

- [ ] **Step 2: Call it lazily from the read path**

In `getSubscriptionStateImpl` (Task 3), add as the **first line inside the `try`** (before `requireUser`):

```ts
await sweepExpiredCancellationsImpl()
```

- [ ] **Step 3: Typecheck**

```
npm run build
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/server/subscriptions.server.ts
git commit -m "feat(subscriptions): app-level sweep fallback when pg_cron unavailable"
```

---

## Task 14: Final build + lint gate

- [ ] **Step 1: Full typecheck + build**

```
npm run build
```
Expected: PASS with no type errors.

- [ ] **Step 2: Lint**

```
npm run lint
```
Expected: PASS. Fix any lint errors (unused vars, missing `import type`, etc.).

- [ ] **Step 3: End-to-end manual smoke test**

Run `npm run dev` and verify both flows end-to-end:
1. **Self-serve period-end cancel + reactivate** (non-free user, Settings tab).
2. **Self-serve immediate cancel** (plan flips to Free).
3. **Admin period-end cancel** of another user.
4. **Admin immediate cancel** of another user.
5. **Admin cannot cancel an admin/owner.**
6. (If pg_cron is enabled) Set a subscription's `current_period_end` to `now() - interval '1 minute'` in the DB, run `select public.sweep_canceled_subscriptions();`, verify the user's `profiles.plan` flips to `free` and an event row is inserted.
7. Verify `subscription_events` has rows for every action with the right `actor_id`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore(subscriptions): final lint + build fixes"
```

---

## Out of scope (do not implement)

- Real Stripe integration (checkout, customer portal, webhook handler, payment methods). The server signatures here are chosen so Stripe slots in later — `cancelSubscriptionImpl` would additionally call `stripe.subscriptions.update(...)` and the pg_cron sweep would be replaced by the `customer.subscription.deleted` webhook.
- Refunds, prorations, invoices.
- The "upgrade after cancel" checkout path (today: existing mock `updatePlan`).
- Per-user media metering (see `docs/STUDIO_BILLING_ROADMAP.md`).

## Reference: spec

Full design rationale: `docs/superpowers/specs/2026-07-13-cancel-subscription-flow-design.md`.
