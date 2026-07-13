# Cancel Subscription Flow — Design Spec

- **Date:** 2026-07-13
- **Status:** Approved (design), pending implementation plan
- **Scope:** Self-serve cancellation (user → Settings) and admin-initiated cancellation (admin → Users tab)
- **Billing context:** Mock billing only. No real Stripe this round. Design is **Stripe-ready** — server-function signatures are chosen so Stripe API calls slot in later without interface changes, and the webhook handler replaces the period-end sweep.

---

## 1. Goals & Non-Goals

### Goals
- A user can cancel their own subscription from Settings, choosing between period-end (default) and immediate cancellation.
- An admin can cancel any user's subscription from the admin Users tab, with a required reason and an audit log entry.
- Cancellations are reversible before period end (reactivation).
- The data model and server interfaces are Stripe-ready: wiring Stripe later is a drop-in.

### Non-Goals
- Real Stripe integration (checkout, customer portal, webhooks, real payments). Deferred.
- Checkout / upgrade-to-paid flow (out of scope; existing mock `updatePlan` remains for plan switching).
- Refunds, prorations, invoices, payment-method management. Deferred to Stripe phase.
- Per-user media metering (covered separately by `docs/STUDIO_BILLING_ROADMAP.md`).

---

## 2. Background

Stripe is **completely absent** from the codebase today. There is no SDK, no env vars, no webhook, no checkout. The current plan system is a mock: `updatePlan()` (`src/server/settings.server.ts:69-85`) and `updateUserPlan()` (`src/server/admin.server.ts:235-255`) both do a direct DB write to `profiles.plan`. Code comments acknowledge this ("real billing ships in Phase 7").

What already exists and is reused unchanged:
- `profiles.plan` (`plan_tier` enum: `free | lite | pro | custom`) — the authoritative plan source for all gating.
- Feature/quota enforcement: `enforceLimit` / `requireFeature` / `consumeQuota` / `getPlanState` (`src/server/profile.server.ts`, `src/server/profile.ts`) — all read `profiles.plan`.
- `PLAN_CONFIGS` (`src/lib/plans.ts`) — plan definitions, prices, features, limits.
- Admin infra: `profiles.role` (`member | admin | owner`), `requireAdmin()` (`src/server/admin.server.ts:96-114`), `is_admin()` SQL fn, admin Users tab with inline plan/role selectors.
- Plan & Billing tab (`src/components/settings/plan-tab.tsx`) — shows plan cards, calls `updatePlan`.
- Existing stub columns on `profiles` (`subscription_status`, `subscription_id`, `trial_ends_at`) — nearly unused; superseded by the new `subscriptions` table.

---

## 3. Cancel Semantics

- **Period-end cancel (default):** Subscription marked `canceled_pending`; `cancel_at_period_end = true`; `current_period_end = now + 30d` (mock). `profiles.plan` **unchanged** → gating unchanged → user keeps access until period end. A sweep (Section 7) flips `profiles.plan → 'free'` and `status → 'canceled'` at period end.
- **Immediate cancel (opt-in toggle on both paths):** `profiles.plan → 'free'` immediately; `status → 'canceled'`. Gating drops on next read.
- **Reactivation:** Valid only while `status = 'canceled_pending'` (before period end). Clears the cancellation, restores `status = 'active'`. Once `status = 'canceled'`, re-enabling a paid plan is an upgrade/checkout action (out of scope; mock fallback = existing `updatePlan`).

These mirror Stripe's `cancel_at_period_end` behavior, so the UX stays consistent when Stripe is wired.

---

## 4. Data Model

New migration: `supabase/migrations/0020_subscriptions.sql`.

### 4.1 `subscriptions` table

One row per subscription relationship per user (one active row per user enforced by partial unique index).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | default `gen_random_uuid()` |
| `user_id` | uuid fk `profiles(id)` | not null |
| `status` | `subscription_status_enum` | `active \| canceled_pending \| canceled \| past_due` |
| `plan_tier` | `plan_tier` (existing enum) | the plan this subscription grants |
| `stripe_customer_id` | text | null until Stripe wired |
| `stripe_subscription_id` | text | null until Stripe wired |
| `current_period_end` | timestamptz | when access lapses |
| `cancel_at_period_end` | boolean | default false |
| `canceled_at` | timestamptz | null while active |
| `canceled_by` | uuid fk `profiles(id)` | self or admin |
| `cancel_reason` | text | null for self-serve when user skips |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | default now() |

Enums:
```sql
create type subscription_status_enum as enum
  ('active','canceled_pending','canceled','past_due');
```

Indexes:
- Unique partial index on `user_id` where `status in ('active','canceled_pending','past_due')` — one active subscription per user.
- `(status, current_period_end)` — for the period-end sweep.

### 4.2 `subscription_events` table (append-only audit log)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid fk `profiles(id)` | whose subscription |
| `actor_id` | uuid fk `profiles(id)` | who performed the action (self or admin) |
| `event_type` | `subscription_event_type_enum` | `canceled \| reactivated \| immediate_downgrade \| plan_changed` |
| `reason` | text | nullable for events without a reason |
| `old_plan` | `plan_tier` | |
| `new_plan` | `plan_tier` | |
| `effective_at` | timestamptz | when the change takes/took effect |
| `metadata` | jsonb | extensible, e.g. `{ immediate: true }` |
| `created_at` | timestamptz | default now() |

```sql
create type subscription_event_type_enum as enum
  ('canceled','reactivated','immediate_downgrade','plan_changed');
```

Index: `(user_id, created_at desc)` — for admin/user history queries.

### 4.3 RLS

- `subscriptions`: users read their own row (`user_id = auth.uid()`); admins read all (`is_admin()`). **No client writes** — all writes via service role / server functions.
- `subscription_events`: users read their own events (`user_id = auth.uid()`); admins read all. No client writes.

### 4.4 Backfill

On migration, for every `profiles` row where `plan <> 'free'`, insert a `subscriptions` row:
```sql
insert into subscriptions (user_id, status, plan_tier, current_period_end, cancel_at_period_end)
select id, 'active', plan, now() + interval '30 days', false
from profiles where plan <> 'free';
```
This ensures grandfathered paid users have a subscription row for the cancel flow to operate on.

### 4.5 Relationship to `profiles.plan`

`profiles.plan` remains the **denormalized cache** that all gating reads. The cancel flow writes to `subscriptions` (source of truth for subscription state) and flips `profiles.plan` only when the change takes effect (immediately for immediate-cancel; at period end via sweep for period-end cancels). Gating code (`enforceLimit`/`requireFeature`/`getPlanState`) is unchanged.

---

## 5. Self-Serve Cancel Flow (User → Settings)

### 5.1 Entry point
In `src/components/settings/plan-tab.tsx`, below the plan cards:
- When `tier !== 'free'` **and** `!isCanceledPending`: show a muted "Cancel subscription" button (low-emphasis, not a primary CTA).
- When `isCanceledPending`: show `<SubscriptionStatusBanner>` (the "ends on {{date}}" banner with Reactivate) instead of the cancel button.
- When `tier === 'free'`: no cancel affordance.

### 5.2 Dialog (`src/components/billing/cancel-subscription-dialog.tsx`)

Single confirm dialog. Contents:
- Heading: "Cancel your `{{PlanLabel}}` subscription".
- Period-end statement: "You'll keep your `{{PlanLabel}}` features until **{{current_period_end formatted}}**, then your account will move to the Free plan."
- Collapsible "What you'll lose": feature/limit delta between current plan and `free`, derived from `PLAN_CONFIGS`.
- Optional reason dropdown ("Too expensive" / "Not enough features" / "Switching to alternative" / "Other") — not required for self-serve.
- Toggle: **"Cancel now instead"** (unchecked by default). When checked: hide the period-end statement, show a warning that access ends immediately.
- Primary: **"Confirm cancellation"** (destructive styling). Secondary: "Keep my plan" (closes).
- On confirm → `cancelSubscription({ immediate, reason? })`.

### 5.3 Post-cancel UI states
- **Period-end:** Plan badge still shows current tier; banner "Your subscription ends on {{date}}. [Reactivate]"; plan cards reflect pending cancellation.
- **Immediate:** UI flips to Free immediately; plan cards show Free as current; upgrade CTAs reappear.
- **Reactivated:** Banner disappears; status returns to active.

---

## 6. Admin-Initiated Cancel Flow (Admin → Users tab)

### 6.1 Entry point
In `src/routes/_authed.admin.tsx` (Users tab, ~lines 260-372): add a kebab/actions menu per user row. Item **"Cancel subscription"** is shown only when `user.plan > 'free'` and the user has an active/`canceled_pending` subscription; disabled/hidden for free users. The existing inline plan selector stays for manual overrides (separate from cancel).

### 6.2 Dialog (`src/components/billing/admin-cancel-dialog.tsx`)

- Heading: "Cancel subscription for `{{user.email}}`".
- Summary: current plan, subscription status, period-end date, start date.
- **Required reason field** — free-text with min length, or dropdown + "Other" detail. Submission blocked without a reason (audit guardrail).
- Timing radio: **"At period end ({{date}})"** [default] vs **"Immediately"**.
- Primary: **"Confirm cancellation"** (destructive). Secondary: "Cancel" (closes).
- On confirm → `cancelSubscription({ targetUserId, immediate, reason })`.

### 6.3 Guardrails
- `requireAdmin()` on the server (existing pattern).
- Owner self-protection: an owner cannot be canceled by another admin via this flow (defensive check in `cancelSubscription`). Admins can still cancel their own subscription via the self-serve path.
- On success: toast ("Subscription for {{email}} canceled — access ends {{date}}"); Users table refreshes.

---

## 7. Server Functions & Data Flow

New files following the existing `<name>.ts` (RPC) + `<name>.server.ts` (impl) pair convention:
- `src/server/subscriptions.ts`
- `src/server/subscriptions.server.ts`

### 7.1 `getSubscriptionState()` — GET, self
Returns the caller's subscription row + derived flags. No subscription row → `{ status: 'none', plan: <profiles.plan> }`. Derived flags: `isCanceledPending`, `isCanceled`, `daysUntilPeriodEnd`.

### 7.2 `cancelSubscription({ targetUserId?, immediate, reason? })` — POST, self or admin
Single cancel entry point for both paths.
1. **Authorize:** no `targetUserId` or equals caller → self; otherwise `requireAdmin()`.
2. **Defensive checks:** reject canceling an owner/admin by another admin; reject if no active subscription to cancel; reject if already canceled.
3. **Load** the active subscription row (or synthesize one if the user is on a paid plan but has no row yet — handles edge cases).
4. **Compute period end:** `immediate → now`; else keep existing `current_period_end` (default `now + 30d` if none).
5. **Write subscription row:** `cancel_at_period_end = !immediate`, `canceled_at = now`, `canceled_by = caller.id`, `cancel_reason = reason`, `status = immediate ? 'canceled' : 'canceled_pending'`.
6. **Flip plan if immediate:** `profiles.plan = 'free'`.
7. **Append `subscription_events`:** `event_type = immediate ? 'immediate_downgrade' : 'canceled'`, `actor_id = caller.id`, `old_plan`, `new_plan = immediate ? 'free' : old_plan`, `effective_at`, `reason`, `metadata = { immediate }`.

### 7.3 `reactivateSubscription({ targetUserId? })` — POST, self or admin
Reverses a `canceled_pending` cancel before period end.
1. Authorize same as above.
2. Reject unless `status = 'canceled_pending'`.
3. Set `cancel_at_period_end = false`, `canceled_at = null`, `canceled_by = null`, `cancel_reason = null`, `status = 'active'`.
4. Append event `{ event_type: 'reactivated', actor_id }`.

### 7.4 `adminGetUserSubscription({ userId })` — GET, admin
Returns the target user's full subscription + recent events, for the admin dialog summary. Guarded by `requireAdmin()`.

### 7.5 Period-end sweep (how pending cancels lapse)

Two mechanisms; **pg_cron is primary**:

- **Primary — `pg_cron` SQL function `sweep_canceled_subscriptions()`:** selects `subscriptions` where `status = 'canceled_pending' AND current_period_end <= now()`, flips `profiles.plan → 'free'`, sets `status → 'canceled'`, appends a `subscription_events` row with `event_type = 'plan_changed'` and `metadata = { source: 'period_end_sweep' }`. (The original cancellation was already logged as `canceled` at cancel time; this event records the actual plan flip at lapse.) Scheduled hourly: `cron.schedule('sweep-canceled-subs', '0 * * * *', 'SELECT sweep_canceled_subscriptions()')`. Runs regardless of app activity — reliable for "access actually lapses on time." Mirrors the real Stripe `customer.subscription.deleted` webhook.
- **Fallback — app-level sweep:** if `pg_cron` extension is not enabled, a `sweepExpiredCancellations()` server fn runs lazily on `getSubscriptionState()`/`getPlanState()` reads. The migration checks for `pg_cron` and skips scheduling if absent, leaving a comment that the app-level fallback applies.

> **Stripe-readiness:** when Stripe is wired, the webhook handler (`customer.subscription.deleted`) performs the same flip the pg_cron job does today, and becomes the drop-in replacement. The sweep is deleted.

### 7.6 Stripe-readiness summary
Server-fn signatures are chosen so that adding Stripe requires only inserting API calls at marked points:
- `cancelSubscription` → additionally `stripe.subscriptions.update(id, { cancel_at_period_end })` or `.del(id)`.
- `reactivateSubscription` → `stripe.subscriptions.update(id, { cancel_at_period_end: false })`.
- pg_cron sweep → replaced by `customer.subscription.deleted` webhook.
- `stripe_subscription_id` / `stripe_customer_id` columns already present.

---

## 8. Components & Hooks

### 8.1 New components (`src/components/billing/`)
- **`cancel-subscription-dialog.tsx`** — self-serve dialog (Section 5.2). Radix Dialog + framer-motion, matching `upgrade-modal.tsx` style.
- **`admin-cancel-dialog.tsx`** — admin dialog (Section 6.2). Required reason validated client-side before submit.
- **`subscription-status-banner.tsx`** — "Your subscription ends on {{date}}" / "Reactivated" banner with Reactivate button, shown in Plan tab when `isCanceledPending`.

### 8.2 Edits to existing files
- **`src/components/settings/plan-tab.tsx`:** render banner when pending; add muted cancel button when eligible; fetch subscription state via `useSubscriptionState()`.
- **`src/routes/_authed.admin.tsx` (Users tab):** add per-row actions menu with "Cancel subscription"; wire to `<AdminCancelDialog>`; invalidate `adminUsers` on success.

### 8.3 New hooks (`src/hooks/use-subscriptions.ts`)
React Query, following `use-plan.ts` / `use-admin.ts`:
- `useSubscriptionState()` — GET `getSubscriptionState`, 5-min cache, refetch on focus.
- `useCancelSubscription()` — mutation; invalidates `subscriptionState` + `planState` + `profile`.
- `useReactivateSubscription()` — mutation; same invalidations.
- `useAdminCancelSubscription()` — mutation; invalidates `adminUsers` + `adminUserSubscription`.

---

## 9. Types

Add to `src/lib/plans.ts` or a new `src/lib/subscriptions.ts`:
- `SubscriptionStatus = 'active' | 'canceled_pending' | 'canceled' | 'past_due' | 'none'`
- `SubscriptionEventType = 'canceled' | 'reactivated' | 'immediate_downgrade' | 'plan_changed'`
- `SubscriptionState` — return type of `getSubscriptionState` (status, plan, period end, cancel flags, days until period end).

---

## 10. Error Handling

`cancelSubscription` throws on:
- No active subscription to cancel.
- Already canceled (`status = 'canceled'`).
- Attempting to cancel another user without admin role (authorization).
- Attempting to cancel an owner/admin by another admin (defensive).

All errors surface as toasts via the mutation's `onError`.

---

## 11. Out of Scope / Future (Stripe phase)

- Real Stripe integration: SDK, env vars, checkout, customer portal, webhooks, payment methods.
- Refunds, prorations, invoices.
- The self-serve "upgrade after cancel" path (today: mock `updatePlan`; future: Stripe checkout).
- Per-user media metering (see `docs/STUDIO_BILLING_ROADMAP.md`).
