# Security Remediation — Change Log

> **Date:** July 2026
> **Scope:** Findings from the 17-point security deep-check, remediated across 5 phases.
> **Status:** All changes implemented, typecheck + production build + lint clean. **Not yet committed.**

This document records what changed, why, and where — so future contributors
understand the security controls in place and don't regress them.

---

## TL;DR

8 of 17 audited areas had findings. All are now remediated:

| # | Vulnerability | Severity | Outcome |
|---|---|---|---|
| 1 | Misconfigured DB (no RLS) | Critical | ✅ Fixed — `usage_windows` + `reorder_studio_scenes` |
| 2 | Unprotected API routes | Critical | ✅ Fixed — webhooks verify signature + secret |
| 3 | Committed secrets | Critical | ✅ Already clean — `.env.example` added for docs |
| 4 | Broken access control (IDOR) | Critical | ✅ Fixed — ~20 server fns scoped by `owner_id` |
| 5 | Secret keys in frontend | Critical | ✅ Already clean |
| 6 | SSRF | High | ✅ Fixed — `assertSafeUrl` guard on agent tools |
| 7 | CSRF protection | High | ✅ Fixed — SameSite cookies + origin middleware |
| 8 | Security headers | Medium | ✅ Fixed — CSP/HSTS/etc. in `start.ts` |
| 9 | Wildcard CORS | High | ✅ Already clean |
| 10 | Rate limiting | Medium | ✅ Fixed — login, signup, webhooks, AI gen |
| 11 | SQL injection | High | ✅ Already clean — `.or()` filters sanitized |
| 12 | XSS | High | ✅ Already clean |
| 13 | Unverified webhooks | High | ✅ Fixed — Telegram + Twilio verification |
| 14 | Insecure file uploads | Medium | ✅ Fixed — size/MIME/extension validation |
| 15 | Verbose error messages | Low | ✅ Fixed — `safeError` helper, ~50 sites |
| 16 | Weak password hashing | Medium | ✅ Already clean (Supabase Auth / bcrypt) |
| 17 | Hallucinated packages | High | ✅ Already clean |

---

## Phase 1 — Critical fixes

### 1.1 Webhook signature verification

**Problem:** `/api/messaging/telegram` and `/api/messaging/whatsapp` were fully
unauthenticated. They use the **service-role** Supabase client (RLS-bypassing)
and resolved the victim purely by attacker-supplied `chatId` / `from`. Anyone
could forge inbound messages, trigger paid AI replies, and drain a victim's
quota.

**Fix:**
- **New `src/server/messaging/verify.ts`** — two helpers:
  - `verifyTelegramWebhook(request)` — constant-time comparison of the
    `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET`.
    Fails closed if the env var is unset.
  - `verifyTwilioWebhook(request, rawBody)` — HMAC-SHA1 over the canonical
    URL + sorted form params, base64-compared to `X-Twilio-Signature` using
    `TWILIO_AUTH_TOKEN`. Handles proxy headers (`x-forwarded-proto`/`-host`).
- Both webhook routes (`routes/api/messaging/{telegram,whatsapp}.ts`) now
  verify **before** any processing and return `401 Unauthorized` on mismatch.
- Also removed verbose error leaks in the reply text.

**New env var:** `TELEGRAM_WEBHOOK_SECRET` — random string; must match the
`secret_token` passed when registering the Telegram webhook.

### 1.2 RLS on `usage_windows`

**Problem:** `usage_windows` (migration 0018) had no RLS. Any authenticated
user could read, zero-out, or delete another user's quota counters —
**bypassing the entire daily rate-limit**.

**Fix — new migration `0022_usage_windows_rls.sql`:**
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Owner-scoped SELECT and UPDATE policies (`user_id = auth.uid()`).
- **No INSERT/DELETE policies** — writes are forced through the
  `try_consume` SECURITY DEFINER RPC (runs as table owner).

### 1.3 `reorder_studio_scenes` RPC IDOR

**Problem:** The `reorder_studio_scenes` Postgres function is `SECURITY DEFINER`
(bypasses RLS) but never checked ownership. Any authenticated user could
reorder — or corrupt via the unique-position constraint — scenes in another
user's storyboard.

**Fix — new migration `0023_reorder_scenes_ownership.sql`:**
- Asserts the storyboard's `owner_id = auth.uid()`; raises otherwise.
- Scopes every UPDATE by both `id = sid AND storyboard_id = p_storyboard_id`,
  so foreign scene ids are no-ops.

---

## Phase 2 — IDOR sweep

**Problem:** ~20 `getById` / `update` / `delete` server functions filtered by
`id` only, with no `owner_id` and often no `getUser()`. They relied solely on
RLS — which was missing on at least one table (`usage_windows`).

**Fix:**
- **New `src/server/_auth.ts`** shared helpers:
  - `requireUserId()` — resolves the session user, throws if absent.
  - `getUserIdOrNull()` — soft variant for read/list paths.
  - `assertOwnership(table, id, userId)` — single PK select scoped by
    `owner_id`, confirms existence + ownership in one round-trip.
- Applied `owner_id` filters across all mutation/getById paths in:
  `media.server.ts`, `storyboard.server.ts`, `studio-chat.server.ts`,
  `chat.server.ts`, `clients.server.ts`, `crm.server.ts` (leads, deals,
  reminders), `documents.server.ts`.

**Principle enforced:** RLS is the primary boundary; explicit `owner_id`
checks are defense-in-depth so a missing/misconfigured policy can't expose data.

---

## Phase 3 — Web hardening

### 3.1 CSRF protection

**Problem:** All mutations go through cookie-authenticated `createServerFn`
RPCs with no CSRF token, no origin check, no `SameSite` enforcement.

**Fix (two layers):**
1. **`src/lib/supabase/server.server.ts`** — the `setAll` cookie callback now
   honors Supabase's cookie options AND hard-enforces:
   - `SameSite=Lax` (blocks cross-site POST cookie submission)
   - `Secure` in production (off in dev for `http://localhost`)
   - `HttpOnly` (no JS access)
2. **New `src/start.ts`** — TanStack Start entry that registers global
   `createCsrfMiddleware`:
   - Validates `Sec-Fetch-Site` (allows `same-origin` + `same-site`)
   - Falls back to `Origin`, then `Referer`
   - Rejects requests carrying none of the three signals (`403 Forbidden`)

### 3.2 Rate limiting

**Problem:** No rate limiting anywhere — login/signup brute-forceable, webhooks
and AI generation hammerable.

**Fix — new `src/server/_rate-limit.ts`** (in-memory sliding window, GC'd):
| Endpoint | Limit |
|---|---|
| `loginFn` | 10 / min / IP |
| `signupFn` | 5 / min / IP |
| Telegram webhook | 30 / min / IP |
| WhatsApp webhook | 30 / min / IP |
| Image generation | 6 / min / user |
| Video generation | 2 / min / user |

Per-user AI limits sit on top of the existing daily `messages` quota.

### 3.3 Security headers

**Problem:** No CSP, HSTS, X-Frame-Options, or any security header configured.

**Fix — `src/start.ts`** stamps these on every response:
- `Content-Security-Policy` — restricts script/connect/img/media origins to
  self + Supabase; inline styles allowed for Tailwind; **no inline scripts**.
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

> **Note on `start.ts`:** this file is auto-detected by the `tanstackStart()`
> vite plugin and replaces the no-op default entry. Its `requestMiddleware`
> runs on every request. The named export must be `startInstance` (not
> default) — the framework imports it via the `#tanstack-start-entry` alias.

---

## Phase 4 — Defense in depth

### 4.1 Secure file uploads

**Problem:** `uploadStudioAttachmentImpl` trusted client-sent MIME + filename,
had no server-side size cap, and accepted `.svg`/`.html` — a stored-XSS vector
via the public storage URL.

**Fix — new `src/lib/media/upload-validate.ts`:**
- Decoded-size cap: 10 MB (`MAX_UPLOAD_BYTES`).
- Extension allowlist: `png, jpg, jpeg, webp, gif, mp4, webm`.
- **Magic-byte sniffing** — declared MIME must match actual content signature.
  SVG/HTML/HTM cannot pass (no matching magic bytes in the allowlist).
- `uploadRejectionMessage()` returns safe, user-facing rejection strings.

Wired into `studio-chat.server.ts` `uploadStudioAttachmentImpl`.

### 4.2 SSRF guard

**Problem:** `analyze_image` and `generate_video` Mastra tools forwarded
LLM-supplied `image_url` with no validation. Prompt injection could target
internal hosts (e.g. `http://169.254.169.254/...` metadata service).

**Fix — new `src/lib/url-guard.ts` (`assertSafeUrl`):**
- Requires `https:` (or `http:` only with explicit opt-in).
- Blocks loopback (`127.`, `::1`), private (`10.`, `192.168.`, `172.16-31.`),
  link-local (`169.254.`, `fe80:`), unique-local (`fc/fd`), `.local`, `.internal`.
- Rejects URL-embedded credentials (`user:pass@host`).
- Applied before forwarding any `image_url` to the model provider.

### 4.3 Error message sanitization

**Problem:** ~50 sites returned raw Postgres/provider error strings to the
client (`{ error: error.message }`), leaking schema details, constraint names,
and provider diagnostics.

**Fix — new `src/server/_errors.ts`:**
- `safeError(err, fallback)` — logs raw detail to stderr, returns generic
  message unless the raw is on a user-facing allowlist
  (`Not authenticated`, `not found`, `daily_message_limit_reached`, etc.).
- `sanitizeSupabaseMessage(rawMessage, fallback)` — variant for the
  `{ error: error.message }` pattern after destructuring.
- Applied across 18 server files + Mastra/chat tools. Provider errors are
  still persisted to DB rows (internal) for debugging; only the RPC return
  is sanitized.

### 4.4 PostgREST filter sanitization

**Problem:** `.or()` filter expressions interpolated user search text
(`name.ilike.%${search}%`). A search value containing `,` or `.` could break
out of the intended column filter (e.g. inject `email.eq.victim@x.com`).

**Fix — `sanitizePostgrestFilter(value)` in `src/server/_errors.ts`:**
- Strips PostgREST metacharacters (`,`, `.`, `(`, `)`, `\\`).
- Escapes SQL LIKE wildcards (`%`, `_`).
- Applied to 4 sites: `client-tools.ts`, `chat-tools.ts`, `clients.server.ts`
  (search), `documents.server.ts` (`agentId` filter).

---

## Phase 5 — Docs & verification

- **`.env.example`** created — documents every env var including the new
  `TELEGRAM_WEBHOOK_SECRET`, with security notes on the service-role key.
- Verified: `tsc --noEmit` clean, `vite build` succeeds, ESLint clean (only
  2 pre-existing `any` errors in `chat.server.ts` — not introduced here).

---

## New files reference

| File | Purpose |
|---|---|
| `src/start.ts` | TanStack Start entry — CSRF + security-headers middleware |
| `src/server/_auth.ts` | `requireUserId`, `assertOwnership` helpers |
| `src/server/_rate-limit.ts` | In-memory sliding-window rate limiter |
| `src/server/_errors.ts` | `safeError`, `sanitizeSupabaseMessage`, `sanitizePostgrestFilter` |
| `src/server/messaging/verify.ts` | `verifyTelegramWebhook`, `verifyTwilioWebhook` |
| `src/lib/url-guard.ts` | `assertSafeUrl` SSRF guard |
| `src/lib/media/upload-validate.ts` | `validateUpload` magic-byte + ext validator |
| `supabase/migrations/0022_usage_windows_rls.sql` | RLS on `usage_windows` |
| `supabase/migrations/0023_reorder_scenes_ownership.sql` | Ownership check in `reorder_studio_scenes` RPC |
| `.env.example` | Env var template |

---

## Deployment checklist

Before going live with these changes:

- [ ] Set `TELEGRAM_WEBHOOK_SECRET` in `.env` (random string).
- [ ] Re-register the Telegram webhook with the secret:
      `setTelegramWebhook(url, { secret_token: TELEGRAM_WEBHOOK_SECRET })`.
- [ ] Apply migrations `0022` + `0023` to Supabase (`supabase db push` or dashboard).
- [ ] Confirm `TWILIO_AUTH_TOKEN` is set (Twilio signature verification needs it).
- [ ] Smoke-test login/signup (rate limits + CSRF may affect non-browser clients).
- [ ] Verify the CSP doesn't break any third-party integrations — tighten
      `connect-src`/`img-src` further if you identify unused hosts.
- [ ] (Optional) Rotate `SUPABASE_SERVICE_ROLE_KEY` + `TELEGRAM_BOT_TOKEN`
      — no git exposure found, but good hygiene.

---

## Regression-prevention notes

When adding new server functions or routes, follow these conventions:

1. **Every `getById` / `update` / `delete`** must filter by `owner_id`
   (or assert ownership via `assertOwnership`). Don't rely on RLS alone.
2. **Never return `error.message` to the client** — use `safeError` /
   `sanitizeSupabaseMessage`. Keep `console.warn` for the raw detail.
3. **Never interpolate raw user input into `.or()` / `.ilike()`** — run it
   through `sanitizePostgrestFilter` first.
4. **New webhook endpoints** must verify a signature or secret before any
   processing, and must rate-limit by IP.
5. **New outbound fetches of user/LLM-supplied URLs** must pass through
   `assertSafeUrl` first.
6. **New file-upload paths** must validate via `validateUpload` (size + ext +
   magic bytes) — never trust client-sent MIME.
7. **Cookies** set via the Supabase SSR client automatically inherit
   `SameSite=Lax; Secure; HttpOnly` — don't override without reason.
