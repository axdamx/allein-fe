# Studio Billing & Metering — Roadmap (NOT YET IMPLEMENTED)

> Created: 2026-07-08
> Updated: 2026-07-08 (added two-layer model + iteration-tax analysis)
> Status: **Image quota implemented on the Studio content centre branch;
> video metering remains deferred**

2026-09-21 update: the `imageGen` quota uses a monthly key in `usage_windows`
with Pro 100 and Custom 500 attempts. Both form and agent image paths consume
it before contacting Z.AI. Migration 0029 is required before deployment.
2026-09-22 update: migration 0034 adds a private reservation ledger and
one-time refunds when no ready Library image exists. Generated images still
count even when a user discards them or removes them from a post.
The historical proposal below remains for future video billing work.
> Priority: **HIGH before scaling past ~10 paying users on video-enabled tiers**

This doc captures the billing architecture decision, the cost math, and the
concrete implementation plan. The current code answers "is this user
*allowed* to generate?" but NOT "has this user *used too much* this month?"
— that gap is an existential billing risk at scale.

---

## ⚠️ Critical insight: iteration tax (added 2026-07-08)

**The problem the naive plan missed:** creative work is inherently iterative.
If we meter every provider call equally, a Pro user iterating on a video
prompt burns $0.70/clip × N attempts and may end up with nothing they wanted
to keep. This punishes normal creative behavior and produces angry users.

**Example of the failure mode:**
```
Pro user chats with Studio Agent (chat is ~free, fine)
   ├─ "make a watercolor coffee shop"
   │     └─► [image gen: $0.01]   ← cheap, fine to iterate
   ├─ "no, more vibrant"
   │     └─► [image gen: $0.01]   ← cheap, fine to iterate
   ├─ "now make it a video"       ← they switch to expensive media
   │     └─► [video gen: $0.70]   ← EXPENSIVE
   └─ "motion is wrong, redo"
         └─► [video gen: $0.70]   ← EXPENSIVE
                                ──────
                                $1.42 burned, user kept nothing
```

**The fix: meter the cheap layer and the expensive layer on completely
different scales.** Iteration on chat/images should feel free; video is
where the strict quota lives.

---

## The two-layer cost model

```
┌─────────────────────────────────────────────────────────────┐
│  CHEAP LAYER  (chat, prompt refinement, planning)            │
│  ───────────────────────────────────────────────────────     │
│  • Studio Agent chat           → glm-4.5-flash (~free)       │
│  • Storyboard brief planning   → glm-4.5-flash (~free)       │
│  • Image generation            → GLM-Image $0.015            │
│                                                              │
│  Meter with: generous daily message quota (already exists)  │
│  + generous monthly image quota                              │
│  Users can iterate freely on prompts/ideas/images            │
│  Even 1000 chat turns = ~$0.10 total cost. Negligible.      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EXPENSIVE LAYER  (the actual media pixels — video)          │
│  ───────────────────────────────────────────────────────     │
│  • Kling video generation    → $0.70/clip                    │
│                                                              │
│  Meter with: SEPARATE monthly quota, much smaller            │
│  Pro: 0 (video is Custom-only)                               │
│  Pro+: 5-10/month                                            │
│  Custom: 30-50/month                                         │
│                                                              │
│  UI MUST warn before each video gen:                         │
│  "Generating video — 1 of 10 monthly credits"                │
└─────────────────────────────────────────────────────────────┘
```

### Why this split works
- **Chat tokens** (`glm-4.5-flash` at ~$0.10/1M tokens) are essentially free.
  A full 50-message creative session costs ~$0.001. Let users iterate freely.
- **Images** ($0.015 each via GLM-Image) are cheap enough that even 100
  iterations/mo = $1.50. Meter generously, while keeping monthly caps.
- **Video** ($0.70/clip via Kling) is about 47× the cost of an image. This is
  where strict metering + clear UX warnings matter most.

### "Should we charge for attempts or successes?"
**Count each generated image, whether or not the user keeps it.** Reasons:
1. Defining "success" is impossible — what if they generate, sort-of-like-it,
   but don't explicitly save?
2. Success-based pricing incentivizes users to declare every output "good"
   to avoid wasting credits, which kills the experimental creative flow.
3. Every major creative tool (Midjourney, Runway, Pika, Kling's own app)
   charges per generation attempt, not per satisfaction.

The UX fix is to make the quota generous enough that normal iteration fits
within it, and to show cost upfront. A failed request with no saved image
returns its app credit once through the reservation ledger (migration 0034).

---

## The original problem (still true)

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
```

A single user on a video-enabled tier can drain your entire Kling balance.

---

## The cost math (why metering is non-negotiable for video)

Kling ~$0.70/video and CogView ~$0.01/image were planning estimates as of
2026-07-06. Active GLM-Image API pricing is $0.015/image as of 2026-09-22.

```
PRO PLAN (RM249/mo ≈ $55/mo) — UNMETERED VIDEO:
  100 videos/mo × $0.70 = $70 cost
  Revenue:                 $55
  LOSS per user:           -$15  💀
  × 100 pro users:         -$1,500/mo

PRO PLAN — 10/mo video cap:
  10 × $0.70 = $7 cost
  Margin:      +$48/user  ✅

IMAGE GEN (any tier) — UNMETERED:
  100 images/mo × $0.01 = $1 cost
  Even with heavy iteration, this is negligible. ✅
```

**Takeaway:** images are safe to leave generous/unmetered for a long time.
Video is where the danger lives.

---

## Recommended quota model (revised)

| Tier | Images/mo | Videos/mo | Cost ceiling | Plan price | Margin |
|---|---|---|---|---|---|
| Free | 0 | 0 | $0 | RM0 | — |
| Lite | 0 | 0 | $0 | RM99 | full |
| Pro | 100 (generous) | **0** | $1 | RM249 ($55) | $54 |
| Pro+ (new tier?) | 200 | **10** | $8 | RM349 ($77) | $69 |
| Custom | 500 | **50** | $40 | RM799 ($180) | $140 |

**Strong recommendation: keep video off Pro entirely** at RM249. Either:
- (a) keep video Custom-only (current state — safest), OR
- (b) introduce a RM349 "Pro+" tier with a small video quota (10/mo)

Images at $0.01 are safe to enable generously on Pro — even 200 iterations
is only $2/user/mo.

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
│     enforceFeature('aiVideoGen' | 'aiImageGen')  │
│                                                  │
│  STEP 2: Admin bypass  ──────► ✅ skip quota     │  ← NEW
│     if (profile.is_admin) → unlimited            │
│                                                  │
│  STEP 3: Monthly quota  ──────► ❌ block         │  ← NEW
│     try_consume('videoGen' | 'imageGen')         │
│     (imageGen: generous; videoGen: strict)       │
│                                                  │
│  STEP 4: Call provider with YOUR key             │
│     ────────────────────────► [Kling/ZAI]        │
│                                                  │
│  STEP 5: Return result + new quota state         │
│     + UI shows remaining credits                 │
└─────────────────────────────────────────────────┘
```

---

## Implementation plan (~3-4 hours, revised)

The quota infra **already exists** — `usage_windows` table + `try_consume`
RPC, currently used for daily message limits. We extend it to monthly
media quotas.

### 1. Extend `LimitMetric` in `src/lib/plans.ts` (15 min)
```ts
export type LimitMetric =
  | 'agents' | 'conversations' | 'messages' | 'posts'
  | 'documents' | 'leads' | 'whatsappMessages' | 'telegramMessages'
  | 'imageGen'      // ← NEW (generous caps)
  | 'videoGen'      // ← NEW (strict caps)
```
Add per-tier limits with `window: 'month'` for both. Image caps generous
(100-500), video caps strict (0-50).

### 2. Add monthly window support to `try_consume` (45 min)
- The `usage_windows` table uses `window_key date` with daily reset only
- Need monthly reset: either (a) new column `window: 'day' | 'month'`, or
  (b) compute month-key separately (e.g. `date_trunc('month', now())::date`)
- Update `consumeQuota()` in `src/server/profile.server.ts` to handle both
- Update `getPlanStateImpl` to return monthly usage for media metrics
- Migration needed: `supabase/migrations/0022_monthly_usage_windows.sql`
- See `supabase/migrations/0018_usage_windows.sql` for current shape

### 3. Wire `consumeQuota()` into media paths (30 min)
- `src/server/media.server.ts` → `generateImageImpl`: add
  `await consumeQuota('imageGen')` before the ZAI call
- `src/server/media.server.ts` → `submitVideoImpl`: add
  `await consumeQuota('videoGen')`
- `src/mastra/tools/studio-tools.ts` → both tools: same calls (since the
  agent path bypasses `media.ts`)
- On quota denial: return a typed `{ error: 'monthly_quota_reached', metric }`
  shape the client recognizes (mirror the daily-message-limit pattern in
  `chat.server.ts`)

### 4. Admin bypass (15 min)
- Check `profile.is_admin` (column may need adding to `profiles` — verify)
- If admin: skip step 3 (quota), still run step 1 (feature gate optional)
- The account owner gets unlimited for testing/demo

### 5. Surface quota in UI (60 min — most important for UX)
- **Composer badge**: "X / Y videos left this month" (parity with message pill)
- **Video generation warning**: confirm dialog or clear label showing
  "Generating video — 1 of 10 monthly credits" BEFORE the call fires.
  This is critical because video is the expensive layer — users must know.
- **Image generation**: lighter-weight badge, no confirmation dialog
  (cheap enough that friction would hurt the creative flow)
- **Storyboard scene "Generate" button**: disable + tooltip when out of quota
- **`usePlan()` hook**: already exposes `remaining` — just needs the new metrics

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

## Future option: "redo refund" (v2, defer for now)

Instead of pure quota, a more generous model:
```
[Generate]      → always costs 1 credit (prevents abuse)
   │
   ▼
[User sees result]
   │
   ├─ "I love it, keep it"   → credit stays consumed (normal)
   │
   └─ "Redo this"            → 50% refund of the credit
                              (acknowledges iteration is normal)
```

This is what Midjourney and Runway do. **Skip for v1** — pure quota with
generous caps + clear UX warnings is simpler and good enough. Revisit if
users complain about iteration friction.

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

**Until then**: keep video on Custom-only (currently the case), and the
risk surface is small. Images at $0.01 each are safe to leave unmetered
for a while — even 1000 images/mo is only $10.
