# 06 — Cost & Metering

The previous five docs covered *capability* — what the AI can do. This one
covers *money* — what it costs to do it, and how the codebase decides whether a
given request is allowed to happen. This is the domain most often skipped by
engineers moving into AI work, and the one most likely to sink a product. An
LLM app without metering is an open wallet.

> **Vocabulary-first.** Terms are defined the first time they appear, in
> **bold**.

---

## 1. The concept

### 1.1 LLM unit economics

Models charge **per token** — roughly, per chunk of word. Both input (what you
send) and output (what the model generates) are billed, and output is usually
2–5× more expensive per token than input. Prices span two orders of magnitude:
a small/fast model like `glm-4.5-flash` is on the order of **$0.10 per million
tokens**; a frontier model can be 100× that. Source for our figures:
`docs/STUDIO_BILLING_ROADMAP.md:75` puts `glm-4.5-flash` at ~$0.10/1M tokens and
estimates a full 50-message creative session at ~$0.001.

A few consequences:

- **Most chat traffic is nearly free.** A 50-turn session for one user is a
  tenth of a cent. You don't need to meter chat aggressively.
- **Long prompts cost more than short ones.** Every retrieved RAG chunk, every
  short-term-memory message, every working-memory template is input tokens,
  paid for on every call. Memory and RAG have a direct cost.
- **Tool-calling agent loops multiply cost.** A `maxSteps: 3` run with two
  tool calls is three full model calls, each with the full context. Doc 01's
  iteration cap is also a cost cap.

### 1.2 Media unit economics

Media generation has a totally different cost profile — per asset, not per
token, and the per-asset costs vary by orders of magnitude:

- **Image generation** (CogView) — about **$0.01 per image**
  (`STUDIO_BILLING_ROADMAP.md:51,77`). Cheap enough that even 100 iterations
  per user per month is $1.
- **Video generation** (CogVideoX now; Kling planned) — about **$0.70 per
  clip** (`STUDIO_BILLING_ROADMAP.md:62,79`). That's **70× an image** for a
  single output.

This asymmetry — cheap images, expensive video — is the single most important
fact in this domain. It drives the whole metering design discussed below.

### 1.3 Authorization vs metering — the crucial distinction

Two different questions, easy to conflate:

- **Authorization** ("is this user *allowed* to use this feature?") — answered
  by a **feature flag**: a boolean per plan tier. "Pro and above can generate
  images." Cheap to check, coarse.
- **Metering** ("has this user *used too much* this period?") — answered by a
  **quota**: a counter that increments per use and is compared against a limit.
  "Free tier gets 10 messages per day." Fine-grained, stateful, the real cost
  control.

A system can have authorization without metering — and that's a **cost leak**.
If a Pro user (authorized for images) has no monthly image cap (unmetered),
they can generate 10,000 images and you eat $100. The authorization gate
answered "yes, you may"; nothing answered "but not that many."

### 1.4 The three gates, in cost-sensitivity order

Production AI systems typically layer three gates between a user request and a
billed model call:

1. **Feature flag** (authorization). Boolean per plan. Coarsest. Cheapest to
   check. Answers "is this tier allowed to do this at all?"
2. **Quota** (metering). Per-period counter compared against a max. Answers
   "has this user used too much this day/month?"
3. **Rate limit** (burst protection). Sliding-window counter. Answers "is this
   single user hammering the API right now?" Not about monthly cost — about
   preventing one user from saturating capacity.

They answer different questions and you typically need all three. A feature
flag without a quota is a cost leak (above). A quota without a rate limit lets
one user burn their monthly allowance in 30 seconds. A rate limit without a
quota lets a slow drip exceed any monthly budget.

### 1.5 The iteration-tax problem

Creative work is iterative. A user generates an image, doesn't like it,
regenerates, tweaks the prompt, regenerates. This is normal, expected, and —
for cheap media — fine: 10 image iterations is $0.10.

For expensive media it's a problem. The roadmap draws it explicitly
(`STUDIO_BILLING_ROADMAP.md:23-35`): a user iterates an image prompt a few
times ($0.01 each, fine), switches to video ($0.70), dislikes the motion,
redoes ($0.70) — **$1.42 burned, user kept nothing they liked**. Per-attempt
metering on expensive media taxes the iteration that's intrinsic to creative
work.

The wrong fix is "only charge for successes." Success is undefinable (only the
user knows whether they liked the result), and success-based pricing
incentivizes users to declare everything "good" to avoid the charge,
destroying the experimental flow. Every major creative-AI tool charges per
attempt.

The right fix has two parts (roadmap `:82-93`):

- **Generous quotas on cheap media.** Let image iteration flow freely. 100
  images/month at $0.01 is $1; not worth restricting.
- **Strict quotas + upfront cost display on expensive media.** A small monthly
  video quota (e.g. 10 clips), and crucially, the UI shows "Generating video
  — 1 of 10 monthly credits" *before* the billed call. The user budgets their
  attempts consciously instead of being surprised by the meter.

### 1.6 Fail-open vs fail-closed

Metering infra is itself infra — it can fail. When the quota database is
unreachable, what do you do with an incoming request?

- **Fail-open**: let the request through. Risk: you give away quota you
  can't track. Best for: unlimited tiers (where there's nothing to track) or
  low-stakes features.
- **Fail-closed**: block the request. Risk: you lock paying users out because
  your infra blipped. Best for: paid, capped features where the cost of
  over-use exceeds the cost of false denials.

A common policy: **fail-closed for paid limits, fail-open for unlimited.** If
the limit is `null` (unlimited), a metering failure shouldn't break the user's
day. If the limit is real, a metering failure shouldn't silently give it away.

---

## 2. How we do it here

### 2.1 The single source of truth — `PLAN_CONFIGS`

All plan facts live in one TypeScript object, `PLAN_CONFIGS`
(`src/lib/plans.ts`). The structure: four tiers (`free`, `lite`, `pro`,
`custom`), each with a `limits: Record<LimitMetric, {max, window}>` and a
`features` object of 13 booleans. AGENTS.md names this file as the source of
truth and requires it to stay in sync with the `/pricing` page copy.

Two limit shapes coexist:

- **Lifetime limits** — `{ max: 10 }` with no `window`. Examples: `agents`
  (free: 1, pro: 10, custom: null), `documents`, `leads`. Enforced at
  create-time; once you've made 10, the 11th is refused.
- **Daily windowed limits** — `{ max: 10, window: 'day' }`. Examples:
  `messages` (free: 10/day, pro: unlimited), `posts`. Enforced per calendar
  day.

The feature flags that matter for AI cost:

```ts
// src/lib/plans.ts:119-120 (free), :154-155 (lite), :190-191 (pro), :222-229 (custom)
// free:  aiImageGen: false,  aiVideoGen: false
// lite:  aiImageGen: false,  aiVideoGen: false
// pro:   aiImageGen: true,   aiVideoGen: false   ← pro has images, NOT video
// custom: aiImageGen: true,  aiVideoGen: true    ← only custom has video
```

Note the asymmetry: **Pro is intentionally video-less** (`plans.ts:191`). Video
is expensive enough that only the top tier gets it. This is the §1.2 unit
economics surfacing directly in plan design.

### 2.2 The three gates in code

**Gate 1 — feature flag** (`enforceFeature`). For media specifically, the gate
lives in `src/server/media.ts`, not in `profile.server.ts`:

```ts
// src/server/media.ts:26-38 (abridged)
async function enforceFeature(feature: 'aiImageGen' | 'aiVideoGen') {
  const { getCurrentUserProfile } = await import('./profile.server')
  const { PLAN_CONFIGS } = await import('@/lib/plans')
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')
  const allowed = PLAN_CONFIGS[profile.plan as keyof typeof PLAN_CONFIGS]?.features?.[feature]
  if (!allowed) {
    const err = new Error(`Feature ${feature} is not available on your plan`)
    err.name = 'PlanFeatureError'
    throw err
  }
  return profile
}
```

Wired in exactly two RPC handlers, both in `media.ts`:

```ts
// src/server/media.ts:74-78 (image), :95-99 (video)
  .handler(async ({ data }) => {
    const profile = await enforceFeature('aiImageGen')   // or 'aiVideoGen'
    enforceGenerationRate(profile.id, 'image')            // or 'video'
    const { generateImageImpl } = await import('./media.server')
    return generateImageImpl(data)
  })
```

**Gate 2 — rate limit** (`enforceGenerationRate`), in the same file:

```ts
// src/server/media.ts:48-61 (abridged)
function enforceGenerationRate(userId: string, kind: 'image' | 'video') {
  const cfg = kind === 'image'
    ? { windowMs: 60_000, max: 6 }   // 6 images / minute
    : { windowMs: 60_000, max: 2 }   // 2 video submissions / minute
  const rl = rateLimit(`gen:${kind}:${userId}`, cfg)
  if (!rl.allowed) {
    const err = new Error('Rate limit exceeded — please slow down and try again shortly.')
    err.name = 'RateLimitError'
    throw err
  }
}
```

Two different burst limits by media type — again the cost asymmetry: video
gets a third of image's burst allowance.

**Gate 3 — quota** (`consumeQuota`). This is the metering primitive. The
signature and policy live in `src/server/profile.server.ts`:

```ts
// src/server/profile.server.ts:93-159 (abridged heavily)
export async function consumeQuota(
  metric: LimitMetric,
  opts?: { userId?: string; plan?: PlanTier; supabase?: ... },
): Promise<ConsumeResult> {
  // ... resolve userId + plan (from session or explicit opts)
  const limit = config.limits[metric]
  const windowKey = limit.window ? windowKeyForWindow(limit.window) : null

  // Lifetime metrics: not consumed here. Caller should use enforceLimitImpl.
  if (!windowKey) {
    return { allowed: true, /* ... */ }
  }

  const { data, error } = await supabase.rpc('try_consume', {
    p_user_id: userId,
    p_metric: METRIC_KEY[metric],
    p_max: limit.max,             // null → unlimited
    p_window_key: windowKey,
  })

  if (error || !data || data.length === 0) {
    // On RPC failure, fail CLOSED for paid limits, OPEN for unlimited.
    if (limit.max === null) {
      return { allowed: true, /* ... */ }
    }
    throw new Error(`Failed to consume quota for ${metric}: ${error?.message ?? 'no data'}`)
  }
  // ... return {allowed, used, remaining, max, resetAt}
}
```

Three things to see here, all important:

- **Lifetime metrics are a no-op in `consumeQuota`** (the early return when
  `!windowKey`). They're enforced separately at create-time via
  `enforceLimitImpl`. Don't look for `consumeQuota('agents')` — it doesn't do
  anything; the count check happens in `enforceLimitImpl`.
- **`try_consume` is an RPC**, not a read-then-write in JS. This is the race
  protection (§2.3).
- **The fail policy is exactly §1.6**: fail-closed for paid limits (throws),
  fail-open for unlimited (`max === null` → allowed).

### 2.3 Race-proof metering — the `try_consume` RPC

The naive metering implementation — "read the count, check against max, write
the increment" — has a race condition: two concurrent requests both read `9`
when the max is `10`, both pass the check, both write, the user consumed 11.
Under load this leaks serious quota.

The fix is to make check-and-increment a single atomic database operation:

```sql
-- supabase/migrations/0018_usage_windows.sql:40-94 (heavily abridged)
create or replace function public.try_consume(
  p_user_id uuid, p_metric text, p_max int, p_window_key date
)
returns table (allowed boolean, used int, remaining int, max_out int, reset_at timestamptz)
language plpgsql as $$
declare
  current_count int;
begin
  -- Lock the row for this (user, metric, window). Concurrent callers block here.
  select count into current_count
    from public.usage_windows
    where user_id = p_user_id and metric = p_metric and window_key = p_window_key
    for update;                           -- row lock: serialises concurrent consumers

  -- ... if p_max is null (unlimited) → always allow, upsert count
  -- ... else compare current_count to p_max; allow and increment, or deny
end;
$$;
```

The key line is **`for update`** (`0018_usage_windows.sql:65`). It takes a row
lock so concurrent calls to `try_consume` for the same user/metric/day
*serialize*: the second caller blocks until the first commits. Under any load,
exactly `p_max` calls succeed. This is the correct way to meter.

### 2.4 Where metering is wired — and where it isn't

`consumeQuota` is called from:

- `chat.server.ts` — `consumeQuota('messages')` at the start of
  `sendMessageImpl` (`chat.server.ts:211`). Chat IS metered.
- `studio-chat.server.ts` — same pattern for studio chat turns.
- `marketing.server.ts` — `consumeQuota('posts')` on post *save*
  (`marketing.server.ts:223`). Note: the AI *generation* does not consume
  quota; the *save* does. This is deliberate (a failed generation shouldn't
  burn a credit) and is documented in the file.

**What is NOT in that list: `media.server.ts`.** Image and video generation
have the feature flag (`enforceFeature`) and the burst rate limit
(`enforceGenerationRate`), but **no `consumeQuota` call**. There is no monthly
image quota and no monthly video quota. This is the headline gap, and §4
covers it as the biggest risk in the AI surface.

### 2.5 The gating boundary convention

One pattern enforced everywhere: the **public `.ts` file enforces, the impl
`.server.ts` file trusts.** AGENTS.md codifies this; you can see it in
`media.ts:8-9`:

> *Plan gating is enforced in the public wrapper (`src/server/media.ts`) before
> these implementations run.*

And the mirror comment in `media.server.ts:7-9` (per AGENTS.md): the impl
re-checks nothing. The same split shows up in `crm.ts`/`crm.server.ts`,
`agents.ts`/`agents.server.ts`, `documents.ts`/`documents.server.ts` — the
public RPC handler calls `enforceLimitImpl` before delegating.

The motivation is twofold: keep server-only deps (Supabase service client,
env vars) out of the client bundle (the `.server.ts` extension is bundler
instructions), and make the gate impossible to skip — the only way to reach
the impl is through the public boundary.

---

## 3. The request flow

Two flows, to make the metering gap concrete by contrast.

**Flow A — a chat message (metered).**

1. User posts → `chat.ts` `sendMessage` RPC → `sendMessageImpl`
   (`chat.server.ts:193`).
2. **`consumeQuota('messages')`** (`chat.server.ts:211`) — atomically checks
   today's count against the daily limit. If denied, the request fails here
   *before any LLM call*. The user's daily budget is protected.
3. Persist the user message.
4. RAG retrieve, prompt assembly, `agent.generate(...)` (docs 01, 03, 05).
5. Persist the assistant message + token counts.

Step 2 is the metering. Chat has authorization (you must be authenticated) and
metering (daily message cap). Two of the three gates.

**Flow B — an image generation (unmetered).**

1. User clicks generate → `media.ts` `generateImage` RPC
   (`media.ts:67-79`).
2. **`enforceFeature('aiImageGen')`** (`media.ts:75`) — the feature flag. Pro
   or above? If not, throws `PlanFeatureError`. End.
3. **`enforceGenerationRate(profile.id, 'image')`** (`media.ts:76`) — the burst
   rate limit (6/minute).
4. Delegate to `generateImageImpl` → ZAI CogView call → insert `studio_assets`
   row.
5. **(MISSING)** — there is no `consumeQuota('imageGen')` call anywhere in
   this flow. Nothing counts the generation against a monthly cap.

Flow B has gates 1 and 3 (feature flag, rate limit) but **not gate 2
(quota)**. A Pro user can generate 1,000 images a month; nothing in the system
notices or stops them. That asymmetry, between Flow A and Flow B, is what the
billing roadmap exists to close.

---

## 4. Where we diverge from best practice

Four divergences.

> ⚠️ **Diverges from best practice: media generation is unmetered today.**
>
> *(as of 2026-07-18 — re-check `media.server.ts` for `consumeQuota` calls
> before relying on this claim; the roadmap below is the plan to close it.)*
>
> **Best practice:** every paid AI action is metered against a per-period
> quota. Authorization (feature flag) is necessary but not sufficient.
>
> **What we do:** image and video generation have feature flags
> (`enforceFeature`) and burst rate limits (`enforceGenerationRate`,
> `media.ts:48-61`) but no `consumeQuota` calls. `media.server.ts` has zero
> quota invocations. A Pro user (authorized for images) has no monthly image
> cap; a Custom user (authorized for video) has no monthly video cap.
>
> **Why:** deferred. `docs/STUDIO_BILLING_ROADMAP.md` documents this as the
> top-priority item before scaling past ~10 paying users on video-enabled
> tiers.
>
> **Verdict: tech debt — and the highest-risk item in the AI surface.** The
> roadmap's implementation plan is concrete (~3–4 hours, six steps): add
> `imageGen` and `videoGen` to `LimitMetric`, extend the `try_consume` RPC
> with monthly windows (migration), wire `consumeQuota('imageGen')` and
> `consumeQuota('videoGen')` into `media.server.ts` and
> `src/mastra/tools/studio-tools.ts`, add an admin bypass, and surface the
> quota in the UI. The metering infrastructure (the race-proof RPC, the
> failure policy, the window key) all already exists and is reusable. Until
> this lands, every video generation by a Custom-tier user is an uncapped
> $0.70 spend.

> ⚠️ **Diverges from best practice: no token-cost observability.**
>
> **Best practice:** every agent call emits token counts and estimated cost to
> an observability backend so you can see aggregate spend, per-user spend, and
> per-feature spend.
>
> **What we do:** Mastra's built-in observability is explicitly OFF. The
> reason is in a comment at `src/mastra/index.ts:14-20` — `@mastra/pg` doesn't
> implement the batch-metrics API, so the default exporter logged a useless
> warning on every call. Token counts are still captured per-message at the
> call site (`chat.server.ts:397-404`), so the raw data exists — but it lands
> in a database row, not a tracing system.
>
> **Why:** the default exporter was broken; rather than ship noise, it was
> disabled.
>
> **Verdict: tech debt — and it compounds the metering gap.** Without
> observability you can't see how bad the unmetered-media leak actually is.
> You can't tune RAG thresholds (doc 03 §4) without seeing retrieved-chunk
> token cost. You can't tune `maxSteps` (doc 01) without seeing per-call
> iteration counts. Cross-reference doc 01's observability divergence; the
> fix is the same: configure a real OTLP/console exporter or set up Mastra
> Cloud.

> ⚠️ **Diverges from best practice: inconsistent quota-failure UX.**
>
> **Best practice:** one consistent quota-exceeded surface across the product.
> The user sees the same kind of message ("you've hit your X limit for Y
> period — upgrade or wait until Z") regardless of which gate triggered.
>
> **What we do:** three different failure shapes coexist:
> - `enforceLimitImpl` throws a `PlanLimitError` (lifetime limits — leads,
>   agents, documents).
> - `enforceFeature` throws a `PlanFeatureError` (`media.ts:34`).
> - `enforceGenerationRate` throws a `RateLimitError` (`media.ts:58`).
> - `consumeQuota` returns `{allowed: false, ...}` — does *not* throw; the
>   caller decides what to do.
>
> The client UI handles each by `err.name` branching. Same underlying concept
> ("you can't do this because of your plan"), four error classes, scattered
> handling.
>
> **Why:** the mechanisms evolved independently; each gate was built at a
> different time.
>
> **Verdict: acceptable, with UX cost.** Functional today, but every new gated
> feature adds another branch to the client's error handling. Worth
> consolidating into one `PlanGateError` with a discriminator when the
> metering work lands.

> ⚠️ **Diverges from best practice: the iteration-tax analysis is documented
> but not implemented.**
>
> **Best practice:** for expensive media, ship generous-but-finite quotas with
> upfront cost display so users budget their own iterations.
>
> **What we do:** the right design is fully worked out in
> `docs/STUDIO_BILLING_ROADMAP.md` — two-layer metering (generous chat/image,
> strict video), the iteration-tax analysis (`:15-39`), the cost figures
> (chat ~$0.001/session, image ~$0.01, video ~$0.70/clip, `:75-80`), and the
> recommendation against success-based pricing (`:82-93`). The design is
> right; the implementation isn't there yet.
>
> **Why:** analysis-first culture. The roadmap was written before any
> metering code, deliberately, so the design would be thought through. The
> implementation is the (deferred) next step.
>
> **Verdict: the analysis is the asset; the work is to ship it.** When you
> implement media metering, follow the roadmap's two-layer model precisely.
> Specifically: do **not** meter video at the same strictness as chat (AGENTS.md
> "things to never do" #5); meter video with a small monthly quota and a
> pre-call confirmation ("Generating video — 1 of 10 monthly credits").

---

## 5. Study prompts

Self-test questions.

1. **Authorization vs metering.** In one sentence each: what does
   `enforceFeature('aiImageGen')` answer, and what does
   `consumeQuota('messages')` answer? Why is a system with only
   `enforceFeature` for media a cost leak?
2. **The race in naive metering.** Write pseudocode for the naive
   "read-check-write" meter. Describe the concrete sequence (two concurrent
   requests, max 10, current count 9) that lets 11 through. Now explain how
   `try_consume`'s `for update` (`0018_usage_windows.sql:65`) prevents it.
   What does "serialize" mean here?
3. **The fail policy.** `consumeQuota` (`profile.server.ts:137-149`) throws on
   RPC failure for paid limits but returns `allowed: true` for unlimited ones.
   Justify each direction. What's the cost of being wrong in each direction?
4. **The three gates in order.** For a video generation request, name the
   three gates in the order they fire, the file:line each fires at, and the
   question each answers. Which one is missing today?
5. **Iteration tax.** You're asked to "fix" the video metering problem by
   "only charging for videos the user keeps." Why does the roadmap reject
   this (`STUDIO_BILLING_ROADMAP.md:82-93`)? What perverse incentive would it
   create? What's the actual recommended fix?

**Experiments to run on this codebase:**

- **Wire `consumeQuota('imageGen')` into `media.server.ts`.** Follow the
  roadmap's six steps. Add `imageGen` to `LimitMetric` (and the
  `METRIC_KEY` map in `profile.server.ts`), add a generous monthly window to
  `PLAN_CONFIGS`, call `consumeQuota('imageGen')` in `generateImageImpl`,
  surface `{allowed: false, resetAt}` in the UI. This is the single most
  valuable PR available in the AI surface right now.
- **Add a cost log.** For one agent call, log `{inputTokens, outputTokens,
  estimatedCostUsd}` to the console. Use the roadmap's $0.10/1M figure. Run
  a real conversation and see what one user actually costs per session.
- **Stress-test the rate limit.** Hit `generateImage` 10 times in quick
  succession as the same user. Confirm `enforceGenerationRate` (`media.ts:48`)
  kicks in at the 7th image. Then check: is the rate limit state in-memory or
  persistent? What happens across server restarts?
- **Read `0018_usage_windows.sql` end to end.** It's the cleanest piece of
  metering infra in the codebase. Trace one call to `try_consume` through the
  function body — the lock, the unlimited short-circuit, the upsert on
  conflict, the `reset_at` computation. This is the pattern to reuse for any
  new metered metric.

**External concepts to read up on** (search these names): **token-based
pricing** (every provider's pricing page — OpenAI, Anthropic, the ZAI/Zhipu
pricing page for our actual numbers); **leaky bucket vs fixed window vs
sliding window** rate limiting (the classic three algorithms); **idempotency
and retries in billed systems** — Stripe's idempotency-key pattern is the
reference; **AWS Step Functions** (or any durable workflow engine) for
async media jobs that may take minutes; **OpenAI's spend dashboard** and
**Anthropic's usage console** as the gold-standard UX for letting users see
their own metering; the general principle of **"cost-aware routing"** —
choosing which model to call based on the estimated cost of the request.
