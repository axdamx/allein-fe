# Studio Billing & Metering — Roadmap (NOT YET IMPLEMENTED)

> Created: 2026-07-08
> Status: **Deferred — UI/UX is in place, metering is not**
> Priority: **HIGH before scaling past ~10 paying users**

This doc captures the billing architecture decision, the cost math, and the
concrete implementation plan for when we pick this up. The current code
answers "is this user *allowed* to generate?" but NOT "has this user
*used too much* this month?" — that gap is an existential billing risk at
scale.

---

## The problem in one diagram

```
                          ┌─────────────────────────────────────────┐
                          │           YOUR BACKEND (server)          │
                          │                                         │
   [Pro User]             │  ✅ enforceFeature('aiVideoGen')         │
   pays you RM249/mo  ──► │     "is this tier allowed?"              │
                          │                                         │
                          │  ❌ NO monthly cap                       │
                          │  ❌ NO admin bypass                      │
                          │  ❌ NO per-user metering                 │
                          │                                         │
                          │  Call Kling with YOUR API key            │
                          │     ────────────────────────────►  [Kling]
                          │     ◄────────────────────────────  bills YOU
                          └─────────────────────────────────────────┘

A single Pro user can drain your entire Kling balance. With 100 Pro users
this is bankruptcy-grade risk.
```

---

## The cost math (why metering is non-negotiable)

Kling ~$0.70/video, CogView ~$0.01/image (as of 2026-07-06).

```
PRO PLAN (RM249/mo ≈ $55/mo) — UNMETERED VIDEO:
  100 videos/mo × $0.70 = $70 cost
  Revenue:                 $55
  LOSS per user:           -$15  💀
  × 100 pro users:         -$1,500/mo

PRO PLAN — 10/mo video cap:
  10 × $0.70 = $7 cost
  Margin:      +$48/user  ✅
  × 100:       +$4,800/mo
```

---

## Recommended quota model

| Tier | Images/mo | Videos/mo | Cost ceiling | Plan price | Margin |
|---|---|---|---|---|---|
| Free | 0 | 0 | $0 | RM0 | — |
| Lite | 0 | 0 | $0 | RM99 | full |
| Pro | 50 | 0 | $0.50 | RM249 ($55) | $54.50 |
| Pro+ (new?) | 100 | 10 | $8 | RM349 ($77) | $69 |
| Custom | 500 | 50 | $40 | RM799 ($180) | $140 |

**Strong recommendation: keep video off Pro entirely** at the current price
point. Either (a) keep video Custom-only, or (b) introduce a RM349 "Pro+"
tier with a small video quota. Images are cheap — safe to enable broadly.

---

## Target architecture

```
[Pro User]
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Your server (media.ts)                           │
│                                                  │
│  STEP 1: Feature gate  ──────► ❌ block          │  ← already done
│     enforceFeature('aiVideoGen')                 │
│                                                  │
│  STEP 2: Admin bypass  ──────► ✅ skip quota     │  ← NEW
│     if (profile.is_admin) → unlimited            │
│                                                  │
│  STEP 3: Monthly quota  ──────► ❌ block         │  ← NEW
│     try_consume('video_gen', userPlan)           │
│     Pro: 0, Pro+: 10, Custom: 50                 │
│                                                  │
│  STEP 4: Call provider with YOUR key             │
│     ────────────────────────► [Kling/ZAI]        │
│                                                  │
│  STEP 5: Return result + new quota state         │
└─────────────────────────────────────────────────┘
```

---

## Implementation plan (~2-3 hours)

The quota infra **already exists** — `usage_windows` table + `try_consume`
RPC, currently used for daily message limits. We extend it to monthly
media quotas.

### 1. Extend `LimitMetric` in `src/lib/plans.ts` (15 min)
```ts
export type LimitMetric =
  | 'agents' | 'conversations' | 'messages' | 'posts'
  | 'documents' | 'leads' | 'whatsappMessages' | 'telegramMessages'
  | 'imageGen'      // ← NEW
  | 'videoGen'      // ← NEW
```
Add per-tier limits with `window: 'month'` for both. Note: `usage_windows`
currently treats `month` as `lifetime` — need to add monthly reset support
to the `try_consume` RPC + window_key computation (see step 5).

### 2. Wire `consumeQuota()` into media paths (30 min)
- `src/server/media.server.ts` → `generateImageImpl`: add
  `await consumeQuota('imageGen')` before the ZAI call
- `src/server/media.server.ts` → `submitVideoImpl`: add
  `await consumeQuota('videoGen')`
- `src/mastra/tools/studio-tools.ts` → both tools: same calls (since the
  agent path bypasses `media.ts`)
- On quota denial: return a typed `{ error: 'monthly_quota_reached', metric }`
  shape the client recognizes (mirror the daily-message-limit pattern in
  `chat.server.ts`)

### 3. Admin bypass (15 min)
- Check `profile.is_admin` (column may need adding to `profiles` — verify)
- If admin: skip step 3 (quota), still run step 1 (feature gate optional)
- You (the account owner) get unlimited for testing/demo

### 4. Surface quota in UI (45 min)
- Composer badge: "X / Y videos left this month" (parity with message pill)
- Storyboard scene "Generate" button: disable + tooltip when out of quota
- MediaGenerator card: same
- `usePlan()` hook already exposes `remaining` — just needs the new metrics

### 5. Monthly window support in `try_consume` (30 min)
- The `usage_windows` table uses `window_key date` with daily reset
- Add monthly reset: either (a) new column `window: 'day' | 'month'`, or
  (b) compute month-key separately
- Update `consumeQuota()` in `src/server/profile.server.ts` to handle both
- Update `getPlanStateImpl` to return monthly usage for media metrics
- See `supabase/migrations/0018_usage_windows.sql` for current shape

### 6. Quota-exceeded UpgradeModal on media paths (30 min)
- Reuse existing `<UpgradeModal>` component
- Reason: `{ kind: 'limit', metric: 'videoGen', used, max }`
- Wire on: composer blocked state, MediaGenerator, storyboard generate

---

## Admin role — open question

**Need to verify**: does `profiles` table have an `is_admin` / `role` column?
If not, add via migration:
```sql
alter table profiles add column if not exists is_admin boolean default false;
```
Then mark the owner's row manually:
```sql
update profiles set is_admin = true where email = 'you@example.com';
```

---

## BYOK alternative (deferred)

If margin pressure gets severe at scale, Option B (Bring Your Own Key) lets
each Pro/Custom user enter their own Kling/ZAI key in Settings, and we call
the provider with THEIR key. You sell only software, not compute.

**Trade-offs:**
- ✅ Zero compute cost to you
- ✅ No quota infra needed for those tiers
- ❌ Brutal UX (users manage API keys + top up)
- ❌ Lower margin (software-only revenue)
- ❌ Non-technical users bounce

**Recommendation**: central billing (Option A) for now. Revisit BYOK only
at 1000+ users or if margins compress.

---

## When to pick this up

**Hard triggers** (do it before):
- First paying Pro+ or Custom customer who has video access
- Onboarding more than ~10 users on video-enabled tiers
- Any marketing push that could spike usage

**Soft triggers** (do it soon):
- Before running paid acquisition
- Before listing on a marketplace/agency directory
- When you want to demo to enterprise prospects

Until then: keep video on Custom-only (currently the case), and the
risk surface is small. Images at $0.01 each are safe to leave unmetered
for a while — even 1000 images/mo is only $10.
