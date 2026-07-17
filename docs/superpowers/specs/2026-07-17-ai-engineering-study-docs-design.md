# AI Engineering Study Docs — Design Spec

**Date:** 2026-07-17
**Author:** brainstorming session (user + ZCode)
**Status:** Approved, pending implementation plan

## Purpose

The user is a software developer transitioning into AI engineering. The codebase
(`allein-fe`) already contains a substantial, real-world AI implementation —
Mastra agents, local-embedding RAG, ZAI/GLM LLM integration, media generation,
quota metering. The user wants a set of docs that lets them **study their own
system as a worked example** to learn AI-engineering concepts and best practices.

The docs are explicitly **not** a re-description of `ARCHITECTURE.md` or
`TECH_SPEC.md` (which document *what* the system is). They are a **learning
companion** that teaches *why* — the underlying concepts, the vocabulary, and
where the codebase diverges from AI-engineering best practice.

## Audience

- Primary: the codebase owner — a software developer learning AI engineering.
- Assumes strong SWE background (TypeScript, React, server functions, SQL).
- Assumes beginner-to-intermediate AI knowledge: has used ChatGPT, may have
  built a prompt flow, but has not internalized concepts like the agent loop,
  semantic recall vs document RAG, or unit economics of media generation.
- Secondary: any future engineer (human or AI agent) onboarding to the AI surface.

## Framing decision

**Hybrid (teach + map).** Every doc does three things in tension:

1. **Teach the concept** so the reader could recognize it in any codebase.
2. **Map the codebase** so the reader sees the concept realized concretely.
3. **Judge the implementation** — explicitly flag divergences from best practice.

The third point is deliberate. The user wants to learn best practices, and a
purely descriptive doc would risk internalizing a local pattern as universal.
Each divergence is stated with its trade-off and whether it is acceptable tech
debt or a defect to fix.

## Domains covered (6)

Selected from a larger menu; the two omitted (media generation providers, AI
security) can be added later as separate docs without disturbing the set.

1. **Agents & the agent loop** — the foundational concept for a SWE moving into
   AI. What an agent is, the LLM↔tool loop, why frameworks exist, system prompts,
   `maxSteps`, and the Mastra agent registry.
2. **Tool calling** — function/tool calling as the bridge from language to
   action; Zod schemas; ownership scoping; the failure modes.
3. **RAG & embeddings** — embeddings, vector search, pgvector, chunking,
   retrieval thresholds, and the OpenAI-embedder trap that the codebase goes
   out of its way to avoid.
4. **Structured LLM output** — why getting JSON from an LLM is hard; JSON schema
   vs prompt-and-parse; repair strategies; the `extractJson()` utility.
5. **Agent memory & context** — the memory layers (short-term / working /
   long-term), thread scoping, and the deliberate split between Mastra `Memory`
   and document RAG.
6. **Cost & metering** — LLM/media unit economics; feature-flag vs quota vs
   rate-limit; the two-layer metering model and the iteration-tax problem.

## File layout

New top-level directory: **`docs/ai-engineering/`**

```
docs/ai-engineering/
├── README.md                                  # index, reading order, how to use
├── 01-agents-and-the-agent-loop.md
├── 02-tool-calling.md
├── 03-rag-and-embeddings.md
├── 04-structured-llm-output.md
├── 05-memory-and-context.md
└── 06-cost-and-metering.md
```

This keeps the study docs separate from:
- `docs/` (Studio-specific implementation status, billing roadmap)
- Root-level architectural docs (`ARCHITECTURE.md`, `TECH_SPEC.md`,
  `CODING_STYLE.md`, `AGENTS.md`)

Cross-references between the new docs and existing ones are one-way: the new
docs link *to* existing docs for the *what*, while existing docs are not edited.

## Document template (the 5-section contract)

Every deep-dive doc (`01`–`06`) follows this exact structure. Consistency is a
feature — the reader should know where to look in every file.

### 1. The concept (~80 lines)
- Defines the domain in vocabulary-first order: terms introduced before use.
- Written assuming the reader knows SWE but is new to AI.
- General enough that the explanation holds outside this codebase.
- No code references yet — pure concept.

### 2. How we do it here (~150 lines)
- Maps the codebase. Every claim cites `file_path:line`.
- Short code excerpts (5–15 lines), each illustrating one point.
- Follows the actual data flow, not an idealized one.
- Names the specific files, functions, RPCs, and migrations involved.

### 3. The request flow (~40 lines)
- One concrete end-to-end trace through the system for this domain.
- Example for agents doc: user sends a chat message → quota check → RAG
  retrieve → system-prompt assembly → `agent.generate()` → tool call →
  persist. Each step cites the file:line where it happens.
- Purpose: show the pieces from §2 moving together.

### 4. Where we diverge from best practice (~50 lines)
- Explicit `> ⚠️ **Diverges from best practice:**` blockquotes (grep-able).
- Each divergence states four things:
  1. The best practice (what a reference implementation would do).
  2. What this codebase does instead.
  3. Why — the constraint, cost, or deliberate trade-off.
  4. Verdict: *acceptable* (reasoned trade-off) or *tech debt* (should fix).

### 5. Study prompts (~20 lines)
- 3–5 questions the reader should be able to answer after studying the doc.
- Pointers to external concepts (e.g. "read about HNSW indexes", "look up
  constrained decoding") — concepts, not specific article URLs that rot.
- 1–2 suggested experiments to run against this codebase.

**Target length:** ~350 lines per deep-dive; ~2400 lines across the set.

## Per-doc scope details

### `01-agents-and-the-agent-loop.md`
- **Concept:** definition of an agent; the LLM↔tool↔observation loop; why an
  agent framework (vs. raw API calls); system prompts and their role;
  `maxSteps`/iteration caps and why they exist; model selection.
- **Code mapped:** `src/mastra/index.ts` (registry, `getAgentByType`,
  `getStudioAgent`); the 7 agents in `src/mastra/agents/*`; `src/lib/ai-provider.ts`
  (ZAI via `@ai-sdk/openai-compatible`); the `.generate()` call sites in
  `chat.server.ts` and `studio-chat.server.ts`; the DB-seeded system prompts in
  `supabase/migrations/0001_initial_schema.sql`.
- **Flow:** inbound chat message → agent selection → generate → tool calls →
  assistant message persisted.
- **Divergences to flag:** two parallel model-provider paths (modern
  `ai-provider.ts` vs legacy raw-fetch `src/lib/ai.ts`); non-streaming
  `.generate()` for chat (full reply returned, no token streaming to UI);
  Mastra observability intentionally disabled (comment in `mastra/index.ts`);
  prompts assembled inline in server code rather than in prompt files.

### `02-tool-calling.md`
- **Concept:** function/tool calling as a concept (separate from "agent");
  why structured tool schemas beat freeform text; the model's role in deciding
  to call; idempotency and retry; side-effect safety.
- **Code mapped:** `src/mastra/tools/*` (`lead-tools`, `client-tools`,
  `task-tools`, `messaging-tools`, `studio-tools`); the `createTool` + Zod
  `inputSchema` pattern; the `context.agent.resourceId` ownership-scoping idiom;
  plan-gating inside tools (`ownerHasFeature`, `enforceLimitImpl`); the studio
  tools' SSRF guard (`assertSafeUrl`) and async job submission.
- **Flow:** agent decides to call `createLead` → tool reads `resourceId` →
  enforceLimit → Supabase insert → tool result fed back to agent → agent
  composes reply.
- **Divergences to flag:** no retry on transient tool failures (a failed
  Supabase insert surfaces to the agent as an error string); tools use the
  service-role Supabase client (RLS bypassed — defense relies on `resourceId`
  being correct); multimodal content cast `as never` to satisfy stricter
  Mastra types (typing debt).

### `03-rag-and-embeddings.md`
- **Concept:** what embeddings are; vector similarity; why a vector DB;
  chunking strategies; retrieval thresholds; reranking; the embedding-model
  size/quality/cost trade-off; pgvector and HNSW.
- **Code mapped:** `src/lib/embeddings.ts` (Transformers.js singleton, mean
  pooling, L2 normalize, 384-dim MiniLM); `src/mastra/local-embedder.ts` (the
  Mastra `EmbeddingModelV2` adapter); the `document_chunks` table + `match_documents`
  RPC (`migrations/0004_rag_vector_dim.sql`); the ingest pipeline in
  `documents.server.ts` (`uploadDocumentImpl`: extract → chunk → embedBatch →
  store); `retrieveContext()` and the `0.12` similarity threshold; the two
  retrieval call sites (chat + marketing).
- **Flow:** user uploads a PDF → status walk (`processing → extracting → … →
  ready`) → later, a chat message triggers `retrieveContext` → chunks injected
  into system prompt.
- **Divergences to flag:** very low `0.12` similarity threshold (deliberate —
  MiniLM scores lower — but risks irrelevant retrieval); small 384-dim model
  (fast/free, lower recall than 1536-dim OpenAI); no reranking step; fixed
  chunk strategy with no overlap tuning surfaced. And the headline: the
  OpenAI-embedder trap that the `studio-agent` explicitly comments out
  semantic recall to avoid.

### `04-structured-llm-output.md`
- **Concept:** why structured output is hard for LLMs; constrained decoding
  vs prompt-and-parse; JSON schema / function-calling modes; repair vs reject;
  when each strategy pays off.
- **Code mapped:** `src/lib/json-extract.ts` (the 4-stage pipeline: strip
  fences → find balanced block → fast parse → repair-and-retry); the two
  call sites that use it correctly — `marketing.server.ts` and
  `storyboard.server.ts`; the file-header comments explaining the deliberate
  avoidance of `generateObject`; the defensive pattern (`extractJson` →
  null-check → field validation → coercion → soft-error return).
- **Flow:** marketing "generate post" → RAG-augmented prompt → `generateText`
  → `extractJson<{title,caption,hashtags}>` → validate → persist.
- **Divergences to flag:** `planner.server.ts` still uses a raw greedy regex
  (`/\[[\s\S]*\]/`) + `JSON.parse` instead of `extractJson` — inconsistent with
  the codebase's own rule (AGENTS.md "things to never do"); `extractJson`
  handles only the *first* JSON block and only repairs comma issues (does not
  repair quote-escaping despite the header comment implying it); no schema
  validation library (Zod) applied to parsed output — validation is ad-hoc.

### `05-memory-and-context.md`
- **Concept:** the three memory layers (short-term conversation / working
  memory / long-term recall); thread and resource scoping; context-window
  management; the difference between conversation memory and knowledge-base
  RAG (often conflated).
- **Code mapped:** the two distinct mechanisms — (a) Mastra `Memory` on the 6
  CRM agents (`lastMessages: 20`, `workingMemory` templates, `semanticRecall`
  with `localEmbedder`) vs (b) the standalone document-RAG pipeline; the
  `studio-agent` that deliberately omits memory/RAG; thread/resource wiring
  via `memory: { resource: user.id, thread: conversationId }`; system-prompt
  assembly in `chat.server.ts` (date + custom instructions + user context +
  RAG context + tool rules).
- **Flow:** returning user sends a message → Mastra loads last 20 messages +
  working memory + semantic-recall top-3 → plus document-RAG top-5 → all
  assembled into the system prompt → agent generates.
- **Divergences to flag:** Studio agent has no memory at all (deliberate —
  avoids the OpenAI trap — but means no conversation continuity there);
  `lastMessages: 20` is fixed and not tuned per agent; prompts are built
  inline in TS rather than in versioned prompt files (no prompt iteration
  workflow, no A/B); working-memory templates are hardcoded per vertical
  rather than data-driven.

### `06-cost-and-metering.md`
- **Concept:** LLM unit economics (per-token, per-image, per-video); the
  difference between *authorization* (can you?) and *metering* (have you used
  too much?); feature flags vs quotas vs rate limits; the iteration-tax
  problem in creative media; fail-open vs fail-closed quota policies.
- **Code mapped:** `src/lib/plans.ts` (`PLAN_CONFIGS`, the 4 tiers, 13 feature
  flags, lifetime vs daily limits); `consumeQuota()` in `profile.server.ts` and
  the race-proof `try_consume` Postgres RPC (`migrations/0018_usage_windows.sql`,
  `FOR UPDATE` row lock); `enforceFeature` / `enforceGenerationRate` in
  `media.ts`; the gating boundary convention (public `.ts` enforces, impl
  `.server.ts` trusts); the fail-closed-for-paid / fail-open-for-unlimited
  policy; `docs/STUDIO_BILLING_ROADMAP.md` as the case study.
- **Flow:** image-generation request → `enforceFeature('aiImageGen')` →
  `enforceGenerationRate` (6/min) → delegate to impl → (today: NO
  `consumeQuota` call) → asset row persisted.
- **Divergences to flag:** **media generation is unmetered today** — the
  single biggest risk, documented as HIGH priority in the billing roadmap;
  no token-cost observability (Mastra observability disabled, no per-request
  cost logging); the iteration-tax analysis is documented but not yet
  implemented; quota failure surfaces as a thrown error in some paths and a
  typed payload in others (inconsistent UX).

### `README.md` (index)
- One-paragraph orientation: who this is for, how it differs from
  `ARCHITECTURE.md`.
- Reading-order guidance: 01 → 02 → 05 → 03 → 04 → 06 (agents and tools first,
  memory after tools, RAG once memory makes the distinction meaningful,
  structured output and metering last as cross-cutting concerns).
- A one-line summary of each doc with a link.
- A "how to use these docs" note: read concept → read code map → trace flow →
  read divergences → attempt study prompts.
- Note on scope: what is *not* covered (media generation providers, AI
  security) and how to extend.

## Writing principles (binding)

These are non-negotiable rules for the implementation phase:

1. **`file_path:line` everywhere.** Every claim about the codebase cites a
   specific file and line. If a line number cannot be verified, it is not
   written.
2. **Re-verify before writing.** The explore phase produced a map. Before
   writing each doc, the implementer re-reads the specific files cited in that
   doc to confirm line numbers and excerpts are current. No doc section is
   written from memory.
3. **Vocabulary first.** Terms are defined before use. First occurrence of a
   term gets a short inline gloss.
4. **Code as evidence.** Excerpts are short (5–15 lines) and each illustrates
   exactly one point. No decorative code.
5. **Consistent divergence callouts.** Every `> ⚠️ **Diverges from best
   practice:**` blockquote is grep-able and follows the four-part structure
   (best practice / what we do / why / verdict).
6. **No invented content.** No fabricated file paths, no speculative line
   numbers, no made-up config values. If something is uncertain, it is verified
   or omitted.
7. **No duplication of existing docs.** Cross-reference, don't restate. The
   new docs link to `ARCHITECTURE.md`, `AGENTS.md`, `TECH_SPEC.md`,
   `STUDIO_BILLING_ROADMAP.md` rather than paraphrasing them.
8. **Concepts over URLs.** External-learning pointers name the concept to read
   about (e.g. "HNSW indexes", "constrained decoding") rather than specific
   article URLs that rot.

## Out of scope (explicit)

- Media generation providers (CogView/CogVideoX, Kling swap) — not selected.
- AI security (SSRF, prompt injection, jailbreak defense) — not selected.
- General app architecture (TanStack Start, Supabase auth, React 19) —
  covered by existing docs.
- Deployment, CI/CD, frontend component design.
- Editing existing docs. The new docs are additive only.

These can be added as future docs (`07-*`, `08-*`) without restructuring.

## Verification plan

Before the doc set is considered complete:

1. **Link integrity** — every internal markdown link resolves; every
   `file_path:line` reference points at a real file (line numbers within the
   file's current length).
2. **Template adherence** — every deep-dive doc has all 5 sections in order.
3. **Divergence grep** — `grep -rn "Diverges from best practice" docs/ai-engineering/`
   returns at least one hit per deep-dive doc (the contract is that each
   domain has at least one flagged divergence).
4. **No duplication** — spot-check that content does not paraphrase
   `ARCHITECTURE.md` or `TECH_SPEC.md` sections.
5. **Build/typecheck unaffected** — docs are markdown-only; no code changes.
   `git status` should show only additions under `docs/ai-engineering/` and the
   spec file.

## Risks & mitigations

- **Risk: line numbers drift.** Code changes between writing and reading.
  *Mitigation:* the docs cite function/RPC names alongside line numbers so a
  reader can `grep` if the line moves. Re-verify at write time.
- **Risk: the doc set becomes stale as the codebase evolves** (e.g. when
  metering is implemented per the billing roadmap). *Mitigation:* doc 06
  explicitly dates the "unmetered today" claim and points at the roadmap;
  divergences are dated relative to the spec date.
- **Risk: scope creep into media/security.** *Mitigation:* out-of-scope list
  above; the README names what is not covered.
- **Risk: subjective "best practice" claims age badly.** *Mitigation:* each
  divergence names the specific best practice being diverged from, so a future
  reader can re-evaluate the claim rather than inherit a vague judgment.

## Deliverable

7 markdown files under `docs/ai-engineering/`, totaling ~2400 lines, plus this
spec. Markdown only — no code changes, no dependency changes.
