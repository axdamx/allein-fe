# AGENTS.md — Project context for AI agents

> This file gives any AI agent (Claude, Gemini, etc.) the context they need
> to be productive immediately. Read this first.

## Stack

- **Framework**: TanStack Start (SSR/meta-framework on Vite) + TanStack Router
- **Language**: TypeScript (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`)
- **React**: 19
- **UI**: Tailwind v4 + shadcn/ui (`new-york` style) + Radix + framer-motion + lucide-react
- **State/data**: TanStack Query for server state, no Redux/Zustand
- **Backend**: Supabase (Auth + Postgres + Storage); server logic via TanStack Start `createServerFn` (RPC)
- **AI**: Vercel AI SDK + Mastra framework, connected to **ZAI / Zhipu GLM** (`glm-4.5-flash` default)
- **Embeddings**: local Transformers.js (`@huggingface/transformers`) for RAG — no OpenAI embedding calls
- **Build**: `vite build && tsc --noEmit`; dev: `vite dev` (port 3000)

## Key conventions

- **Server functions**: pair `src/server/<name>.ts` (public RPC, enforces gates) with `src/server/<name>.server.ts` (impl). See `marketing.ts` / `marketing.server.ts` as the canonical example.
- **Feature gating**: `enforceLimitImpl(metric)` for quotas, `enforceFeature(flag)` for booleans — both in `src/server/profile.server.ts` / `src/server/media.ts`. Always enforced server-side at the public boundary.
- **Plan config**: single source of truth in `src/lib/plans.ts` (`PLAN_CONFIGS`). Keep in sync with `/pricing` copy.
- **JSON from LLMs**: GLM-4.5-flash doesn't reliably honor `responseSchema`. Use `src/lib/json-extract.ts` (`extractJson()`) instead of raw `JSON.parse` on LLM output — it handles markdown fences, trailing commas, balanced-block extraction.
- **ZAI errors**: use `extractZaiErrorMessage()` in `src/lib/media/zai-client.ts` — ZAI returns nested `{ error: { code, message } }` and `String()` on that gives `[object Object]`.

## Where things live

- Routes: `src/routes/` (TanStack Router file-based). Authed pages under `_authed.*`.
- Mastra: `src/mastra/` (agents, tools, config). Agent registry: `src/mastra/index.ts`.
- Media pipeline: `src/lib/media/` (provider-abstracted; swap here, not in hooks/UI).
- Supabase migrations: `supabase/migrations/` (numbered `NNNN_name.sql`).

## Docs

- `docs/STUDIO.md` — full Studio implementation status (4 tabs, what's built, file map)
- `docs/STUDIO_BILLING_ROADMAP.md` — **deferred**: per-user metering + admin bypass plan. HIGH priority before scaling past ~10 paying users. Read before touching media quota logic.
- `ARCHITECTURE.md`, `CODING_STYLE.md`, `TECH_SPEC.md` — older but still relevant

## Known deferred work

1. **Studio metering** — see `docs/STUDIO_BILLING_ROADMAP.md`. Current code gates by feature flag only, no per-user monthly cap. This is the biggest open risk.
2. **Video provider swap** — likely ZAI → Kling (via fal.ai) for quality. Abstraction in `src/lib/media/` makes this localized.
3. **Storyboard → post export** (contact sheet / multi-asset post)

## Things to never do

- Don't add OpenAI embedding calls (the `OPENAI_API_KEY` in `.env` has no balance — use local Transformers.js via `src/lib/embeddings.ts`).
- Don't enable Mastra `semanticRecall` on new agents without swapping the embedder (it defaults to OpenAI).
- Don't parse LLM JSON with a raw greedy regex + `JSON.parse` — use `extractJson()`.
- Don't ship a metered feature without wiring `consumeQuota()` — see billing roadmap.
