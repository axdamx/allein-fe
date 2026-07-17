# AI Engineering Study Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a 7-file study-doc set under `docs/ai-engineering/` that teaches six AI-engineering domains using the codebase's own implementation as worked examples, with explicit divergences from best practice flagged.

**Architecture:** Markdown-only deliverable. Each deep-dive doc follows a fixed 5-section template (concept → code map → request flow → divergences → study prompts). A README index orients the reader and links the deep-dives. No code is changed, no dependencies added. Every `file_path:line` reference is verified against the current source before the section using it is written.

**Tech Stack:** Markdown (GitHub-flavored). Source references span `src/mastra/`, `src/lib/`, `src/server/`, and `supabase/migrations/`.

**Spec:** `docs/superpowers/specs/2026-07-17-ai-engineering-study-docs-design.md`

---

## How this plan adapts the writing-plans format

The writing-plans skill is written for code (TDD: write failing test → implement → pass → commit). This deliverable is documentation, so there are no tests to fail/pass. The adapted task structure is:

- **Verify sources** — re-read the cited files and confirm line numbers (the spec's binding rule #2: "re-verify before writing").
- **Write the doc** — produce the markdown following the template.
- **Verify the doc** — run the verification checks (link integrity, template adherence, divergence grep, no duplication).
- **Commit.**

Each task is one doc. Tasks are independent and can be executed in any order or in parallel, EXCEPT Task 1 (README) which should be written last so its links and one-line summaries match the final doc titles — OR written first as a skeleton and updated in Task 8. This plan writes it first as a skeleton (Task 1) and finalizes it last (Task 8), so a reader always has an entry point.

---

## File Structure

All files live under `docs/ai-engineering/`:

| File | Responsibility |
|---|---|
| `README.md` | Index: orientation, reading order, per-doc one-liners, how-to-use note, scope statement. |
| `01-agents-and-the-agent-loop.md` | Concept of agents/the agent loop; maps the Mastra registry + 7 agents + provider config + generate call sites. |
| `02-tool-calling.md` | Concept of tool calling; maps `src/mastra/tools/*`, ownership scoping, in-tool gating. |
| `03-rag-and-embeddings.md` | Concept of embeddings/vector search; maps `embeddings.ts`, `local-embedder.ts`, `documents.server.ts`, pgvector migrations. |
| `04-structured-llm-output.md` | Concept of structured output; maps `json-extract.ts` + its two call sites + the planner counter-example. |
| `05-memory-and-context.md` | Concept of memory layers; maps Mastra `Memory` config + the memory-vs-RAG distinction + prompt assembly. |
| `06-cost-and-metering.md` | Concept of unit economics + metering; maps `plans.ts`, `consumeQuota`, `try_consume` RPC, media gating, billing roadmap. |

**Boundary rule:** each doc owns its concept. Where two docs touch the same file (e.g. `chat.server.ts` appears in both 01 and 05), each doc cites only the lines relevant to its concept and cross-references the other doc rather than repeating.

---

## Task 1: Scaffold the directory and README skeleton

**Files:**
- Create: `docs/ai-engineering/README.md`

- [ ] **Step 1: Create the directory and README skeleton**

Create `docs/ai-engineering/README.md` with this content:

```markdown
# AI Engineering Study Docs

A learning companion for the AI surface of this codebase. If you are a software
engineer moving into AI engineering, read these docs to learn the concepts
(agents, tool calling, RAG, structured output, memory, metering) using our own
implementation as the worked example.

## How these differ from the rest of the docs

- `ARCHITECTURE.md` and `TECH_SPEC.md` describe **what** the system is.
- `AGENTS.md` is the **AI coding agent's** onboarding contract.
- These docs are the **human engineer's** study guide — they teach *why*, define
  vocabulary, and call out where this codebase diverges from AI-engineering
  best practice.

## Reading order

1. [Agents & the agent loop](./01-agents-and-the-agent-loop.md) — the foundational concept.
2. [Tool calling](./02-tool-calling.md) — how agents take action.
3. [Memory & context](./05-memory-and-context.md) — how agents remember (read before RAG, because RAG makes more sense once memory is clear).
4. [RAG & embeddings](./03-rag-and-embeddings.md) — retrieval over your own documents.
5. [Structured LLM output](./04-structured-llm-output.md) — getting JSON from a model.
6. [Cost & metering](./06-cost-and-metering.md) — the economics that make or break an AI product.

## How to use each doc

Every deep-dive has five sections, in this order:

1. **The concept** — vocabulary-first, general, no code yet.
2. **How we do it here** — the codebase mapped with `file:line` references.
3. **The request flow** — one end-to-end trace through the system.
4. **Where we diverge from best practice** — flagged with `> ⚠️ Diverges from best practice:` callouts.
5. **Study prompts** — questions to test yourself, and experiments to run.

## Scope

**Covered:** agents, tool calling, RAG, structured output, memory, metering.

**Not covered (yet):** media generation providers (CogView/CogVideoX, the future Kling swap), AI security (SSRF, prompt injection). These are future docs (`07-*`, `08-*`).
```

- [ ] **Step 2: Commit the skeleton**

```bash
git add docs/ai-engineering/README.md
git commit -m "docs(ai-eng): scaffold study docs index"
```

---

## Task 2: Write `01-agents-and-the-agent-loop.md`

**Files:**
- Create: `docs/ai-engineering/01-agents-and-the-agent-loop.md`

**Source files to verify before writing** (re-read each, confirm line numbers):
- `src/mastra/index.ts` — registry, `getAgentByType`, observability-disabled comment
- `src/mastra/agents/property-agent.ts` — canonical CRM agent shape
- `src/mastra/agents/studio-agent.ts` — the no-memory variant
- `src/lib/ai-provider.ts` — ZAI provider, `getDefaultModel`
- `src/server/chat.server.ts` — the `.generate()` call site + `maxSteps: 3`
- `src/lib/ai.ts` — the legacy raw-fetch client (for the divergence callout)

- [ ] **Step 1: Re-verify source line numbers**

Run: `rg -n "maxSteps|getAgentByType|getDefaultModel|generate\(\[" src/mastra/index.ts src/mastra/agents/property-agent.ts src/mastra/agents/studio-agent.ts src/lib/ai-provider.ts src/server/chat.server.ts`
Expected: confirms the registry keys (L26-32), `getAgentByType` (L40), the `propertyAgent` generate/memory shape, the `studioAgent` no-recall comment (L35-37), and the `maxSteps: 3` call in chat.server.ts. Record exact line numbers for use in the doc.

- [ ] **Step 2: Write Section 1 — The concept**

Write ~80 lines covering:
- What an LLM is in one paragraph (probabilistic next-token predictor over text).
- The limitation that motivates agents: an LLM alone is stateless and can't take action.
- The **agent loop**: prompt → model → (optional tool call) → observation → model → … until the model returns a final answer with no tool call. Define "tool call", "observation", "iteration", "max steps".
- Why agent frameworks (Mastra, LangChain, Vercel AI SDK) exist: the loop, memory wiring, tool dispatch, and provider abstraction are tedious and error-prone to hand-roll.
- **System prompts**: the role of the high-level instructions that shape behavior; the difference between system, user, and assistant messages.
- **maxSteps / iteration caps**: why every framework lets you cap the loop (cost, infinite loops, runaway tool chains).

- [ ] **Step 3: Write Section 2 — How we do it here**

Write ~150 lines. Cite and excerpt (5–15 lines each):
- The Mastra registry `src/mastra/index.ts:22-34` — `new Mastra({ storage, vectors, agents })` with 7 agents keyed by vertical.
- The two accessors: `getAgentByType(type)` (L40-47, builds id `${type}-agent`) and `getStudioAgent()` (L50-52).
- The canonical CRM agent shape — `src/mastra/agents/property-agent.ts:15-50` — `id`, `name`, `instructions`, `model: getDefaultModel()`, `tools`, `memory`.
- The studio agent variant — `src/mastra/agents/studio-agent.ts:15-44` — same skeleton, but note the longer `instructions` (a real behavioral spec, L18-32) and the deliberately minimal memory.
- The model provider — `src/lib/ai-provider.ts:21-29` — `createOpenAICompatible({ name: 'zai', baseURL, apiKey })`, `DEFAULT_MODEL_ID = 'glm-4.5-flash'`.
- The invocation — `src/server/chat.server.ts` `sendMessageImpl` around the `agent.generate([...], { memory: {...}, maxSteps: 3 })` call. Explain `maxSteps: 3` caps the tool-call loop.
- DB-seeded system prompts — `supabase/migrations/0001_initial_schema.sql` (the `agent_types` rows with `system_prompt`).

- [ ] **Step 4: Write Section 3 — The request flow**

Write ~40 lines tracing one chat message:
1. User posts a message → `chat.ts` RPC → `sendMessageImpl` in `chat.server.ts`.
2. Quota check (`consumeQuota('messages')`) — cite the line.
3. Persist user message.
4. RAG retrieve (`retrieveContext`) — note this is documented fully in doc 03.
5. System-prompt assembly (date + custom instructions + user context + RAG context).
6. `getAgentByType(agent.type)` picks the agent.
7. `agent.generate([system, user], { memory: { resource, thread }, maxSteps: 3 })`.
8. Tool calls extracted from `result.steps[].toolResults`, persisted with the assistant message.

- [ ] **Step 5: Write Section 4 — Divergences**

Write ~50 lines with at least three `> ⚠️ Diverges from best practice:` callouts, each with the four-part structure (best practice / what we do / why / verdict):

1. **Two parallel model-provider paths.** Best practice: one provider abstraction. We have `src/lib/ai-provider.ts` (modern, Vercel AI SDK) AND `src/lib/ai.ts` (legacy hand-rolled SSE fetch). Why: the legacy client handles GLM-specific `reasoning_content` tokens and is still referenced by `agents.server.ts`. Verdict: tech debt — consolidate when convenient; don't add new callers to `ai.ts`.

2. **Non-streaming `.generate()` for chat.** Best practice for chat UX: token streaming via `streamText` so the user sees incremental output. We call `.generate()` and return the full reply + a `toolCalls[]` array. Why: simpler error handling, and tool-call results need the full response anyway. Verdict: acceptable trade-off for now, but a perceptible UX cost on long replies — note where streaming would plug in.

3. **Observability disabled.** Best practice: every agent call logged with token counts, latency, cost, tool-call traces. We have Mastra observability explicitly OFF — cite `src/mastra/index.ts:14-20` (the `@mastra/pg` batch-metrics API isn't implemented). Why: the exporter logged noise on every call. Verdict: tech debt — this is a real blind spot for cost debugging (cross-ref doc 06).

4. **Prompts assembled inline in server code.** Best practice: versioned prompt files (or a prompt registry) for iteration and A/B testing. We build system prompts as inline template strings in `chat.server.ts`. Why: YAGNI at current scale. Verdict: acceptable until prompt iteration becomes frequent.

- [ ] **Step 6: Write Section 5 — Study prompts**

Write ~20 lines with 3–5 self-test questions (e.g. "What happens if an agent makes 4 tool calls in a row under `maxSteps: 3`?", "Why does `getAgentByType` return null instead of throwing?"), pointers to external concepts ("the ReAct paper", "function calling vs tool calling naming", "streaming vs batch generation trade-offs"), and 1–2 experiments ("temporarily raise `maxSteps` to 10 and trace the tool-call chain in the debugger").

- [ ] **Step 7: Verify the doc**

Run these checks:
- `grep -c "file_path\|\.ts:\|\.sql:" docs/ai-engineering/01-agents-and-the-agent-loop.md` — expect ≥ 8 file:line references.
- `grep -c "Diverges from best practice" docs/ai-engineering/01-agents-and-the-agent-loop.md` — expect ≥ 3.
- Count `##` section headers — expect exactly 5 (`## 1. The concept`, `## 2. How we do it here`, `## 3. The request flow`, `## 4. Where we diverge from best practice`, `## 5. Study prompts`).
- Spot-check 3 file:line references against source — open the cited file and confirm the line says what the doc claims.

- [ ] **Step 8: Commit**

```bash
git add docs/ai-engineering/01-agents-and-the-agent-loop.md
git commit -m "docs(ai-eng): agents & the agent loop"
```

---

## Task 3: Write `02-tool-calling.md`

**Files:**
- Create: `docs/ai-engineering/02-tool-calling.md`

**Source files to verify before writing:**
- `src/mastra/tools/lead-tools.ts` — `createLeadTool`, `context.agent.resourceId`, `enforceLimitImpl`
- `src/mastra/tools/client-tools.ts`, `task-tools.ts`, `messaging-tools.ts` — the other CRM tools
- `src/mastra/tools/studio-tools.ts` — `ownerHasFeature`, `generateImageTool`, `generateVideoTool`, `assertSafeUrl`, `analyzeImageTool`
- `src/lib/url-guard.ts` — `assertSafeUrl`

- [ ] **Step 1: Re-verify source line numbers**

Run: `rg -n "resourceId|enforceLimitImpl|ownerHasFeature|assertSafeUrl|createTool" src/mastra/tools/ src/lib/url-guard.ts`
Expected: confirms `context?.agent?.resourceId` in `lead-tools.ts:17`, the `enforceLimitImpl('leads')` try/catch at L21-25, and the studio tools' gating + SSRF guard lines. Record exact line numbers.

- [ ] **Step 2: Write Section 1 — The concept**

Write ~80 lines:
- Define **tool calling** (aka function calling): the model emits a structured request to invoke a named function with typed arguments, rather than freeform text.
- Why it beats parsing the model's prose: typed schemas (Zod / JSON Schema) give the model a contract and let the framework validate arguments before execution.
- The flow: model decides to call → framework validates args → framework executes the tool → result fed back as an observation → model continues. (Cross-ref doc 01's agent loop.)
- **Side effects and safety**: tools that write to a DB or send messages are irreversible; idempotency and retry matter.
- **Ownership/authorization**: the model is not trusted; the tool must enforce who can act on whose data.

- [ ] **Step 3: Write Section 2 — How we do it here**

Write ~150 lines. Cite and excerpt:
- The `createTool` + Zod pattern — `src/mastra/tools/lead-tools.ts:5-15` — `id`, `description` (critical: this is what the model reads to decide whether to call), `inputSchema: z.object({...})`, `execute`.
- **Ownership scoping** — `src/mastra/tools/lead-tools.ts:16-17` — `const ownerId = context?.agent?.resourceId`. Explain that `resourceId` is injected server-side via `memory.resource = user.id` (cross-ref doc 05), and the tool uses the **service-role** Supabase client (RLS bypassed), so `resourceId` is the only thing scoping the write.
- **In-tool plan gating** — `lead-tools.ts:20-25` — the tool itself calls `enforceLimitImpl('leads')` and returns a soft `{success: false}` instead of throwing (so the agent can relay a friendly message).
- **Proactive extraction** — note the `description` field instructs the model to extract name/email/phone from context rather than asking. This is prompt engineering embedded in the tool schema.
- The studio tools — `src/mastra/tools/studio-tools.ts` — `generateImageTool` (feature-gated via `ownerHasFeature('aiImageGen')`), `generateVideoTool` (SSRF-guarded via `assertSafeUrl` on `image_url`), `analyzeImageTool` (multimodal `generateText` with image content).
- The SSRF guard — `src/lib/url-guard.ts` `assertSafeUrl` — why every model-supplied URL is validated before fetch (defends against prompt-injection-driven internal host targeting).

- [ ] **Step 4: Write Section 3 — The request flow**

Write ~40 lines tracing one tool call:
1. Agent receives "save John as a lead, john@acme.com".
2. Model emits a `createLead` tool call with `{name: "John", email: "john@acme.com"}`.
3. Framework validates against `inputSchema`.
4. `execute` runs: reads `resourceId`, calls `enforceLimitImpl('leads')`, inserts via service-role client scoped by `owner_id`.
5. Result `{success: true, leadId, message}` fed back as observation.
6. Agent composes the user-facing reply ("Saved John as a new lead.").

- [ ] **Step 5: Write Section 4 — Divergences**

Write ~50 lines, ≥ 3 callouts:

1. **No retry on transient tool failures.** Best practice: retry idempotent tools on transient errors (DB timeout, network blip) with backoff. Our tools return `{success: false, error: 'Operation failed'}` on any insert error — the agent relays a generic failure. Why: simplicity; most failures are quota or constraint violations, not transient. Verdict: acceptable, but flag that a flaky Supabase connection surfaces as a confusing user message.

2. **Service-role client in tools (RLS bypassed).** Best practice: defense-in-depth — RLS at the DB plus app-level checks. Tools use `getSupabaseServiceClient()` which bypasses RLS, relying solely on `resourceId` for scoping. Why: the model runs server-side under an authenticated session, and service-role avoids per-query RLS overhead. Verdict: acceptable *only because* `resourceId` is server-injected and never model-controlled — but document the invariant loudly. If a tool ever accepted an `ownerId` from the model's arguments, this would be a security hole.

3. **`as never` casts for multimodal content.** Best practice: types match the framework's expected shape. Our image-content arrays are cast `as never` because Mastra's types are stricter than the AI SDK's. Why: the runtime shape is correct; only the types disagree. Verdict: tech debt — fragile to framework upgrades.

4. **Gating split across boundaries.** Some tools gate inside `execute` (`createLeadTool` → `enforceLimitImpl`); studio tools gate via `ownerHasFeature` helper. Best practice: one gating idiom. Verdict: minor inconsistency, acceptable.

- [ ] **Step 6: Write Section 5 — Study prompts**

~20 lines: questions ("Why does `createLeadTool` return `{success:false}` instead of throwing on quota exceed?", "What would break if a tool read `ownerId` from the model's arguments instead of `context.agent.resourceId`?"), external concepts ("JSON Schema for function calling", "idempotency keys", "the OWASP LLM top 10 — specifically injection via tool args"), experiments ("add a retry wrapper around the Supabase insert in `createLeadTool` and test with a forced timeout").

- [ ] **Step 7: Verify the doc**

- `grep -c "\.ts:" docs/ai-engineering/02-tool-calling.md` — expect ≥ 8.
- `grep -c "Diverges from best practice" docs/ai-engineering/02-tool-calling.md` — expect ≥ 3.
- Section header count — expect 5.
- Spot-check 3 file:line references.

- [ ] **Step 8: Commit**

```bash
git add docs/ai-engineering/02-tool-calling.md
git commit -m "docs(ai-eng): tool calling"
```

---

## Task 4: Write `03-rag-and-embeddings.md`

**Files:**
- Create: `docs/ai-engineering/03-rag-and-embeddings.md`

**Source files to verify before writing:**
- `src/lib/embeddings.ts` — Transformers.js singleton, 384-dim MiniLM
- `src/mastra/local-embedder.ts` — the Mastra `EmbeddingModelV2` adapter
- `src/server/documents.server.ts` — ingest pipeline (`uploadDocumentImpl`), `retrieveContext`, the `0.12` threshold
- `supabase/migrations/0004_rag_vector_dim.sql` — pgvector 384-dim, `match_documents` RPC
- `supabase/migrations/0001_initial_schema.sql` — the original 1536-dim `document_chunks` (for the history/divergence)
- `src/mastra/agents/property-agent.ts:28-49` — the `semanticRecall` + `localEmbedder` wiring

- [ ] **Step 1: Re-verify source line numbers**

Run: `rg -n "all-MiniLM-L6-v2|384|match_documents|similarity|0\.12|semanticRecall|localEmbedder|EmbeddingModelV2" src/lib/embeddings.ts src/mastra/local-embedder.ts src/server/documents.server.ts supabase/migrations/0004_rag_vector_dim.sql src/mastra/agents/property-agent.ts`
Expected: confirms model id (embeddings.ts:21), `dim = 384` (embeddings.ts:48), the threshold `0.12` in `retrieveContext`, the `match_documents` RPC signature, and `semanticRecall` config at property-agent.ts:44-47. Record exact line numbers.

- [ ] **Step 2: Write Section 1 — The concept**

Write ~80 lines:
- Define **embedding**: a vector (list of floats) representing the meaning of text; semantically similar text → nearby vectors.
- **Vector similarity**: cosine distance (`<=>` in pgvector); `1 - distance = similarity`.
- Why a **vector database** (pgvector, Pinecone, Weaviate): brute-force similarity over millions of vectors is slow; specialized indexes (HNSW, IVF) make it fast.
- **RAG** (Retrieval-Augmented Generation): embed a query, find the most similar document chunks, inject them into the prompt so the model grounds its answer in your data.
- The pipeline: **chunk** documents → **embed** chunks → **store** vectors → at query time **embed query** → **retrieve** top-k → **inject** into prompt.
- **Retrieval thresholds**: filtering by minimum similarity to avoid garbage results.
- **Reranking**: a second model that re-orders retrieved chunks for precision (we don't do this — divergence).
- The **embedding-model trade-off**: size/quality/cost. Large models (OpenAI 1536-dim) → better recall, cost per call, external dependency. Small models (MiniLM 384-dim) → free, local, lower recall.

- [ ] **Step 3: Write Section 2 — How we do it here**

Write ~150 lines. Cite and excerpt:
- The local embedder — `src/lib/embeddings.ts:9-26` — `@huggingface/transformers`, `env.allowLocalModels = false`, singleton `embedderPromise`, `Xenova/all-MiniLM-L6-v2`, `device: 'cpu'`.
- Mean pooling + normalize — `src/lib/embeddings.ts:32-38` — `pooling: 'mean', normalize: true` (explain why normalization matters for cosine similarity).
- Batch embedding — `src/lib/embeddings.ts:43-55` — flat Float32Array sliced into 384-dim rows.
- The Mastra adapter — `src/mastra/local-embedder.ts` — implements `EmbeddingModelV2` via `doEmbed({values})` delegating to `embedBatch`. This is what lets Mastra's `semanticRecall` use MiniLM instead of OpenAI.
- Storage — `supabase/migrations/0004_rag_vector_dim.sql` — `document_chunks.embedding vector(384)`, HNSW index with `vector_cosine_ops`, the `match_documents` RPC filtered by owner + optional agent.
- The ingest pipeline — `src/server/documents.server.ts` `uploadDocumentImpl` — status walk `processing → extracting → chunking → embedding → storing → ready`, batched `embedBatch` at 20 chunks.
- Retrieval — `src/server/documents.server.ts` `retrieveContext(query, agentId?, matchCount=5)` — embeds the query, calls `match_documents`, filters `similarity > 0.12`, sorts descending. Explain the deliberately low threshold (MiniLM scores lower than large models).
- The two call sites — `chat.server.ts` (inject as `## Knowledge Base Context`) and `marketing.server.ts` (brand-voice chunks for post generation).
- The CRM agents' `semanticRecall` — `src/mastra/agents/property-agent.ts:28-49` — note this is a *different* retrieval (conversation memory, not documents); cross-ref doc 05.

- [ ] **Step 4: Write Section 3 — The request flow**

Write ~40 lines tracing one document upload + later retrieval:
1. User uploads a PDF → `documents.ts` RPC → `uploadDocumentImpl`.
2. Status → `extracting` (text via pdf-parse / OCR via tesseract.js).
3. Status → `chunking` (split into ~chunk-size pieces).
4. Status → `embedding` (`embedBatch` in batches of 20).
5. Status → `storing` (insert `document_chunks` rows with 384-dim vectors).
6. Status → `ready`.
7. Later: a chat message → `retrieveContext(message, agent.id, 5)` → embed query → `match_documents` RPC → filter `> 0.12` → top 5 → inject into system prompt.

- [ ] **Step 5: Write Section 4 — Divergences**

Write ~50 lines, ≥ 3 callouts:

1. **Very low similarity threshold (`0.12`).** Best practice: tune the threshold empirically per model; MiniLM's score distribution is lower than large models, but `0.12` risks retrieving weakly-related chunks. Why: documented in `documents.server.ts` — MiniLM produces lower scores; the threshold was set to avoid over-filtering. Verdict: acceptable but under-tuned — a known trade-off worth revisiting with real query logs (which we lack, see doc 06 observability gap).

2. **Small 384-dim model, no reranking.** Best practice for production RAG: a stronger embedding model + a cross-encoder reranker for precision. We use MiniLM (fast/free/local) and no reranker. Why: cost zero, no external dependency, no OpenAI balance. Verdict: acceptable trade-off for a CRM-scale corpus; revisit if retrieval quality complaints emerge.

3. **The OpenAI-embedder trap.** This is the headline. Mastra's `Memory` defaults to an OpenAI embedder for `semanticRecall`. We go out of our way to inject `localEmbedder` (property-agent.ts:31) so recall never calls OpenAI — and the `studio-agent` omits `semanticRecall` entirely with an explicit comment (`studio-agent.ts:35-37`). Best practice: frameworks shouldn't default to a paid external dependency silently. Verdict: this is a framework-design wart we've correctly worked around; document loudly so no new agent enables recall without the adapter.

4. **Fixed chunking, no overlap tuning surfaced.** Best practice: tune chunk size + overlap for the corpus. We use a fixed strategy. Verdict: acceptable at current scale.

- [ ] **Step 6: Write Section 5 — Study prompts**

~20 lines: questions ("Why must the query embedding use the same model as the chunk embeddings?", "What would happen if you enabled Mastra `semanticRecall` on a new agent without setting `embedder`?", "Why is cosine similarity appropriate for normalized vectors?"), external concepts ("HNSW vs IVF indexes", "cross-encoder rerankers", "chunk size and overlap", "MTEB benchmark"), experiments ("raise the threshold to 0.3 and observe retrieval recall on your test documents", "log the similarity scores of retrieved chunks for a week").

- [ ] **Step 7: Verify the doc**

- `grep -c "\.ts:\|\.sql:" docs/ai-engineering/03-rag-and-embeddings.md` — expect ≥ 8.
- `grep -c "Diverges from best practice" docs/ai-engineering/03-rag-and-embeddings.md` — expect ≥ 3.
- Section header count — expect 5.
- Spot-check 3 file:line references.

- [ ] **Step 8: Commit**

```bash
git add docs/ai-engineering/03-rag-and-embeddings.md
git commit -m "docs(ai-eng): RAG & embeddings"
```

---

## Task 5: Write `04-structured-llm-output.md`

**Files:**
- Create: `docs/ai-engineering/04-structured-llm-output.md`

**Source files to verify before writing:**
- `src/lib/json-extract.ts` — the full 4-stage pipeline (already read in planning)
- `src/server/marketing.server.ts` — `generatePostImpl`, the `extractJson` call, the no-`generateObject` header comment
- `src/server/storyboard.server.ts` — `generateStoryboardFromBriefImpl`, the `extractJson` call
- `src/server/planner.server.ts` — the raw greedy regex `/\[[\s\S]*\]/` + `JSON.parse` (the counter-example)

- [ ] **Step 1: Re-verify source line numbers**

Run: `rg -n "extractJson|generateObject|responseFormat|JSON\.parse|\\\[[\\s\\S]*\\\]" src/lib/json-extract.ts src/server/marketing.server.ts src/server/storyboard.server.ts src/server/planner.server.ts`
Expected: confirms `extractJson` at json-extract.ts:23, the two call sites in marketing/storyboard, and the greedy regex in planner. Record exact line numbers.

- [ ] **Step 2: Write Section 1 — The concept**

Write ~80 lines:
- The problem: you want the model to return structured data (JSON), but models are text generators that drift, add prose, use trailing commas, wrap in markdown fences.
- **Strategy A — Constrained decoding / JSON schema mode**: the framework forces the model's token distribution so it can only emit valid JSON (`responseFormat: json_schema`). Most robust, but requires provider support and can hurt quality on some models.
- **Strategy B — Function/tool calling for structured output**: define a tool whose args are your schema; the model's tool call is structured by construction.
- **Strategy C — Prompt + parse + repair**: instruct the model to emit JSON, then parse defensively. Cheapest, most portable, most fragile.
- **Repair vs reject**: when parse fails, do you retry, repair (regex fixes), or return a soft error? Trade-offs.
- When each strategy pays off: schema mode for providers that support it well; tool-calling when you're already in an agent loop; prompt+parse for small/local/quirky models.

- [ ] **Step 3: Write Section 2 — How we do it here**

Write ~150 lines. Cite and excerpt:
- Why not `generateObject` — `src/lib/json-extract.ts:14-16` header comment + `src/lib/ai-provider.ts:12-16` (ZAI/GLM doesn't reliably honor `responseFormat: json_schema`; the SDK warning is suppressed).
- The `extractJson` pipeline — `src/lib/json-extract.ts:23-49` — four stages: strip fences (L27-29) → `findBalancedBlock` (L56-97) → fast `JSON.parse` (L36-37) → `repairJson` + retry (L43-48).
- The balanced-block walker — `json-extract.ts:56-97` — bracket stack + string-state tracking; correctly skips braces inside string values; bails on mismatched closers.
- The repairs — `json-extract.ts:104-108` — trailing comma before close (`,\s*([}\]])` → `$1`), duplicate commas.
- The two call sites:
  - `marketing.server.ts` `generatePostImpl` — prompt for `{title, caption, hashtags}`, `extractJson<{...}>(result.text)`, field validation, `String()`/`Number()` coercion, soft-error return.
  - `storyboard.server.ts` `generateStoryboardFromBriefImpl` — prompt for `{title, scenes:[...]}`, `Array.isArray` validation, scene-count clamp (2-8).
- The defensive call pattern — extract → null-check → validate → coerce → soft-error (never throw on parse failure; treat as recoverable "please try again").

- [ ] **Step 4: Write Section 3 — The request flow**

Write ~40 lines tracing one marketing post generation:
1. User clicks "generate post" → `marketing.ts` RPC → `generatePostImpl`.
2. (Optional) RAG retrieve brand-voice chunks.
3. Build prompt: system instructions + brand context + "respond with JSON `{title, caption, hashtags}`".
4. `generateText({ model: getDefaultModel(), prompt })`.
5. `extractJson<{title, caption, hashtags}>(result.text)`.
6. If null → return `{error: 'Could not parse the response, please try again'}`.
7. Validate fields, coerce, clamp lengths.
8. Persist the post.

- [ ] **Step 5: Write Section 4 — Divergences**

Write ~50 lines, ≥ 3 callouts:

1. **`planner.server.ts` uses a raw greedy regex, not `extractJson`.** Best practice (and our own AGENTS.md rule): use `extractJson` everywhere. `planner.server.ts` uses `/\[[\s\S]*\]/` + raw `JSON.parse` — exactly the pattern AGENTS.md warns against. Why: predates the utility, hasn't been refactored. Verdict: tech debt — this is the single clearest fix in the whole codebase; refactor to `extractJson`.

2. **No Zod validation on parsed output.** Best practice: parse with `extractJson`, then validate with a Zod schema (we already depend on Zod for tools). We do ad-hoc `String()`/`Array.isArray()` checks. Why: the shapes are small. Verdict: acceptable at current size, but scales poorly — a Zod schema per output shape would centralize validation.

3. **Limited repair scope.** `extractJson` only repairs comma issues; the header comment mentions "unescaped quotes inside string values" but the repair function doesn't actually fix that case (it's only detected via string-state tracking in the block finder). Best practice: either repair quotes or drop the claim from the comment. Verdict: minor — fix the comment to match the code, or add the quote repair.

4. **First-block-only.** `extractJson` returns the first balanced block; if the model emits two JSON objects, the second is lost. Best practice for multi-object output: parse an array, or document the single-block limitation. Verdict: acceptable — current call sites expect a single object.

- [ ] **Step 6: Write Section 5 — Study prompts**

~20 lines: questions ("Why might constrained decoding hurt model quality on some tasks?", "When is tool-calling a better fit than prompt+parse for structured output?", "What's the failure mode of a greedy regex like `/\[[\s\S]*\]/`?"), external concepts ("JSON Schema", "constrained decoding / grammar-based generation", "outlines / llama.cpp grammars"), experiments ("refactor `planner.server.ts` to use `extractJson` and compare failure rates", "add a Zod schema to `generatePostImpl`'s output").

- [ ] **Step 7: Verify the doc**

- `grep -c "\.ts:" docs/ai-engineering/04-structured-llm-output.md` — expect ≥ 6.
- `grep -c "Diverges from best practice" docs/ai-engineering/04-structured-llm-output.md` — expect ≥ 3.
- Section header count — expect 5.
- Spot-check 3 file:line references.

- [ ] **Step 8: Commit**

```bash
git add docs/ai-engineering/04-structured-llm-output.md
git commit -m "docs(ai-eng): structured LLM output"
```

---

## Task 6: Write `05-memory-and-context.md`

**Files:**
- Create: `docs/ai-engineering/05-memory-and-context.md`

**Source files to verify before writing:**
- `src/mastra/agents/property-agent.ts:28-49` — the full `Memory` config (already read)
- `src/mastra/agents/studio-agent.ts:35-43` — the no-recall variant (already read)
- `src/mastra/config.ts` — `storage` + `vectorStore` selection
- `src/server/chat.server.ts` — system-prompt assembly, `memory: { resource, thread }` in the generate call
- `src/server/documents.server.ts` `retrieveContext` — the document-RAG mechanism (cross-ref doc 03)

- [ ] **Step 1: Re-verify source line numbers**

Run: `rg -n "lastMessages|workingMemory|semanticRecall|resource:|thread:|buildUserContext|## User Context|## Knowledge Base Context" src/mastra/agents/property-agent.ts src/mastra/agents/studio-agent.ts src/mastra/config.ts src/server/chat.server.ts`
Expected: confirms `lastMessages: 20` + `workingMemory` + `semanticRecall` at property-agent.ts:32-48, the studio minimal memory at studio-agent.ts:38-43, and the prompt-assembly functions in chat.server.ts. Record exact line numbers.

- [ ] **Step 2: Write Section 1 — The concept**

Write ~80 lines:
- Why memory matters: LLMs are stateless; every call is independent. "Memory" is whatever you inject back into the context.
- **Three layers** (industry vocabulary):
  - **Short-term / conversation memory**: recent messages in the same thread.
  - **Working memory / scratchpad**: extracted facts about the user/session (name, preferences, goals) kept in a compact structured form.
  - **Long-term memory / recall**: semantically retrieving relevant *past* conversations.
- **Thread and resource scoping**: a thread = one conversation; a resource = the owner. Memory is scoped per (resource, thread).
- **Context window management**: you can't dump every message ever; frameworks cap (e.g. `lastMessages: 20`) and summarize.
- **The crucial distinction**: conversation *recall* (semantic search over past messages in this product) is different from *knowledge-base RAG* (search over uploaded documents). They look similar (both use embeddings) but serve different purposes and often get conflated. (Foreshadow doc 03.)

- [ ] **Step 3: Write Section 2 — How we do it here**

Write ~150 lines. Cite and excerpt:
- The full Mastra `Memory` config — `src/mastra/agents/property-agent.ts:28-49` — `storage` + `vector` + `embedder: localEmbedder`, `lastMessages: 20`, `workingMemory: { enabled: true, template }`, `semanticRecall: { topK: 3, messageRange: 2 }`.
- Explain each option:
  - `lastMessages: 20` — the short-term layer; the last 20 messages are always in context.
  - `workingMemory` with `template` — the scratchpad; the model fills the template (`# User Profile / - Name: / - Budget Range: / …`) and it's re-injected each turn. Note the template is per-vertical (property vs insurance vs sales).
  - `semanticRecall` — the long-term layer; embeds the current message, finds the top-3 most similar *past messages* (with 2 messages of surrounding context each), injects them. Backed by `localEmbedder` (cross-ref doc 03).
- Storage selection — `src/mastra/config.ts` — Supabase Postgres (`PostgresStore` + `PgVector`) in prod, local LibSQL in dev.
- The studio agent's deliberate omission — `src/mastra/agents/studio-agent.ts:35-43` — only `lastMessages: 20`, no `vector`, no `semanticRecall`, with the comment explaining why (would call OpenAI embedding). This is the same trap as doc 03; cross-reference.
- Thread/resource wiring — `src/server/chat.server.ts` — `agent.generate([...], { memory: { resource: user.id, thread: conversationId } })`. Explain that `resource: user.id` is what makes `context.agent.resourceId` available to tools (cross-ref doc 02).
- The **document-RAG mechanism** is separate — `retrieveContext` in `documents.server.ts` injects uploaded-document chunks as `## Knowledge Base Context`. This is NOT Mastra memory; it's manual prompt injection. Make the distinction explicit.
- System-prompt assembly — `chat.server.ts` — date + custom instructions + `## User Context` (from profile) + `## Knowledge Base Context` (RAG) + tool-call rules. Mastra's memory layers are added on top by the framework.

- [ ] **Step 4: Write Section 3 — The request flow**

Write ~40 lines tracing a returning user's message:
1. User sends message → `sendMessageImpl`.
2. Quota + persist user message.
3. `retrieveContext(content, agent.id, 5)` — document-RAG chunks (manual injection).
4. Build dynamic system prompt (date + instructions + user context + KB context + tool rules).
5. `agent.generate([system, user], { memory: { resource: user.id, thread }, maxSteps: 3 })`.
6. Inside the framework: Mastra loads `lastMessages: 20` + fills/reloads `workingMemory` + runs `semanticRecall` (top-3 past messages via `localEmbedder`).
7. Full context = system prompt + RAG chunks + memory layers → model.
8. Assistant reply + tool calls persisted.

- [ ] **Step 5: Write Section 4 — Divergences**

Write ~50 lines, ≥ 3 callouts:

1. **Studio agent has no long-term memory.** Best practice: offer continuity where the user expects it. The studio agent has `lastMessages: 20` only — no working memory, no recall. Why: avoids the OpenAI-embedder trap, and creative-generation sessions are often short. Verdict: acceptable trade-off, but means a user closing and reopening a studio chat loses extracted context. Document the reasoning so it's a deliberate choice, not an oversight.

2. **Fixed `lastMessages: 20` across all agents.** Best practice: tune per agent (a legal agent might need more context than a car-dealer agent). Why: one less knob. Verdict: acceptable; revisit if specific agents show context loss.

3. **Working-memory templates hardcoded per vertical.** Best practice: data-driven templates configurable per deployment. We hardcode a `# User Profile` template per agent file. Why: YAGNI. Verdict: acceptable at current scale.

4. **Prompts assembled inline, no prompt files.** (Same as doc 01's callout — cross-reference rather than repeat in full.) Best practice: versioned prompts. We build strings in `chat.server.ts`. Verdict: acceptable until prompt iteration is frequent.

5. **Memory vs RAG distinction is implicit.** Best practice: make the two retrieval mechanisms visibly distinct in code organization. They're split across `chat.server.ts` (manual RAG injection) and Mastra's `Memory` (recall). Verdict: acceptable but worth documenting (which is what this doc does).

- [ ] **Step 6: Write Section 5 — Study prompts**

~20 lines: questions ("What's the difference between `workingMemory` and `semanticRecall`?", "Why is `resource: user.id` critical for tool ownership?", "If you wanted the studio agent to remember user preferences across sessions, what would you need to add?"), external concepts ("mem0", "LangGraph memory", "context window compression / summarization", "episodic vs semantic memory"), experiments ("enable `semanticRecall` on the studio agent *with* `localEmbedder` and observe whether cross-session recall works", "log the assembled system prompt for one chat turn to see all the layers").

- [ ] **Step 7: Verify the doc**

- `grep -c "\.ts:" docs/ai-engineering/05-memory-and-context.md` — expect ≥ 6.
- `grep -c "Diverges from best practice" docs/ai-engineering/05-memory-and-context.md` — expect ≥ 3.
- Section header count — expect 5.
- Spot-check 3 file:line references.

- [ ] **Step 8: Commit**

```bash
git add docs/ai-engineering/05-memory-and-context.md
git commit -m "docs(ai-eng): memory & context"
```

---

## Task 7: Write `06-cost-and-metering.md`

**Files:**
- Create: `docs/ai-engineering/06-cost-and-metering.md`

**Source files to verify before writing:**
- `src/lib/plans.ts` — `PLAN_CONFIGS`, the 4 tiers, feature flags, lifetime vs daily limits
- `src/server/profile.server.ts:93-159` — `consumeQuota` (already read)
- `src/server/media.ts` — `enforceFeature`, `enforceGenerationRate` (already read)
- `supabase/migrations/0018_usage_windows.sql` — the `try_consume` RPC, `FOR UPDATE` row lock
- `docs/STUDIO_BILLING_ROADMAP.md` — the two-layer model + iteration-tax analysis (the case study)

- [ ] **Step 1: Re-verify source line numbers**

Run: `rg -n "PLAN_CONFIGS|free|lite|pro|custom|aiImageGen|aiVideoGen|try_consume|FOR UPDATE|consumeQuota|enforceFeature|enforceGenerationRate|6 images|2 video" src/lib/plans.ts src/server/profile.server.ts src/server/media.ts supabase/migrations/0018_usage_windows.sql`
Expected: confirms the 4 tiers and feature flags in plans.ts, the `try_consume` RPC + `FOR UPDATE` in the migration, the fail-closed/fail-open policy in `consumeQuota` (profile.server.ts:137-149), and the 6/min + 2/min rate limits in media.ts:52-54. Record exact line numbers.

- [ ] **Step 1b: Re-read the billing roadmap**

Read `docs/STUDIO_BILLING_ROADMAP.md` in full before writing — it's the case study for this doc and the source of the two-layer model + iteration-tax framing. Note its line numbers for the citations (especially the cost figures: chat ~$0.001/session, image ~$0.01, video ~$0.70/clip).

- [ ] **Step 2: Write Section 1 — The concept**

Write ~80 lines:
- **LLM unit economics**: models charge per token (input + output), tiers vary wildly. A "cheap" model (`glm-4.5-flash`) might be ~$0.10/1M tokens; a frontier model 100× more.
- **Media unit economics**: image gen is ~$0.01/image; video gen is ~$0.70/clip — 70× more expensive, and iterative.
- **Authorization vs metering**: two different questions. *Authorization* (feature flag): "is this user's plan allowed to use this feature?" *Metering* (quota): "has this user used too much this period?" A system can have authorization without metering — and that's a cost leak.
- **Three gates, in order of cost-sensitivity**:
  - **Feature flag** (boolean per plan) — coarse, cheapest to check.
  - **Quota** (per-period counter) — fine-grained, the real cost control.
  - **Rate limit** (burst protection) — stops one user from hammering in a window; not about monthly cost.
- **The iteration-tax problem**: in creative media, users iterate. Per-attempt metering on expensive media burns credits on attempts the user discards. The fix is *not* "charge only for successes" (success is undefinable, and it incentivizes users to game it) — it's generous quotas + upfront cost display.
- **Fail-open vs fail-closed**: when the metering infra itself fails (DB down), do you let the request through (fail-open — risk giving away quota) or block it (fail-closed — risk locking out paying users)? Paid tiers should fail-closed; unlimited should fail-open.

- [ ] **Step 3: Write Section 2 — How we do it here**

Write ~150 lines. Cite and excerpt:
- The single source of truth — `src/lib/plans.ts` `PLAN_CONFIGS` — 4 tiers (`free`, `lite`, `pro`, `custom`), each with `limits: Record<LimitMetric, {max, window}>` and `features` (13 booleans). Note `aiImageGen` is true on pro+custom, `aiVideoGen` on custom only.
- Two limit shapes: **lifetime** (`agents`, `leads`, `documents`) enforced at create-time via `enforceLimitImpl`; **daily windowed** (`messages`, `posts`) enforced via `consumeQuota`.
- `enforceFeature` — `src/server/media.ts:26-38` — the authorization gate; throws `PlanFeatureError`.
- `enforceGenerationRate` — `src/server/media.ts:48-61` — burst protection (6 images/min, 2 videos/min); throws `RateLimitError`.
- `consumeQuota` — `src/server/profile.server.ts:93-159` — the metering primitive. Explain the flow: resolve user+plan → look up limit → compute window key (only `day` produces a key; lifetime is a no-op, L119-127) → call `try_consume` RPC → map result.
- The race-proof RPC — `supabase/migrations/0018_usage_windows.sql` `try_consume` — `FOR UPDATE` row lock serializes concurrent calls so exactly `max` succeed under any load.
- **Fail policy** — `profile.server.ts:137-149` — on RPC error: fail-closed for paid limits (throw), fail-open for unlimited (`max === null` → allowed). Explain why.
- The gating boundary convention — public `.ts` enforces, impl `.server.ts` trusts (cross-ref the AGENTS.md convention).
- **The headline gap** — `media.server.ts` has NO `consumeQuota` calls. Image/video generation is authorized (feature flag) and burst-limited (rate limit) but NOT metered. There is no monthly cap. This is the single biggest cost risk.

- [ ] **Step 4: Write Section 3 — The request flow**

Write ~40 lines tracing one image generation:
1. User clicks generate → `media.ts` `generateImage` RPC.
2. `enforceFeature('aiImageGen')` — authorization (throws `PlanFeatureError` if not pro+).
3. `enforceGenerationRate(userId, 'image')` — burst check (6/min).
4. Delegate to `generateImageImpl` → ZAI CogView call → insert `studio_assets` row.
5. **(MISSING)** — there is no `consumeQuota('imageGen')` call here. Contrast with `sendMessageImpl`, which does call `consumeQuota('messages')`.

Also trace a chat message for contrast: `consumeQuota('messages')` → persist → generate. Show that chat IS metered while media IS NOT.

- [ ] **Step 5: Write Section 4 — Divergences**

Write ~50 lines, ≥ 3 callouts:

1. **Media generation is unmetered today.** Best practice: every paid AI action is metered against a per-period quota. Image/video gen has feature-flag + rate-limit but no monthly quota — a pro user could generate thousands of images. Why: deferred — see `docs/STUDIO_BILLING_ROADMAP.md`, flagged HIGH priority. Verdict: tech debt, and the highest-risk item in the AI surface. Date this claim: "as of 2026-07-17".

2. **No token-cost observability.** Best practice: log per-request token counts + estimated cost. Mastra observability is disabled (`src/mastra/index.ts:14-20`); there's no per-request cost log. Why: the `@mastra/pg` batch-metrics API isn't implemented. Verdict: tech debt — you can't optimize what you can't see; this compounds the metering gap (cross-ref doc 01).

3. **Inconsistent quota-failure UX.** Best practice: one consistent quota-exceeded surface. `enforceLimitImpl` throws `PlanLimitError`; `enforceFeature` throws `PlanFeatureError`; `consumeQuota` returns `{allowed: false}` and the caller decides. The UI handles each differently. Why: the mechanisms evolved separately. Verdict: acceptable but inconsistent — consolidate the error surface when convenient.

4. **Iteration-tax analysis documented but not implemented.** Best practice (per the roadmap): generous chat/image caps + strict video caps + upfront cost display. The analysis is done (`STUDIO_BILLING_ROADMAP.md`); the implementation is not. Verdict: the design is right; this is the work to do. Include the cost figures (chat ~$0.001/session, image ~$0.01, video ~$0.70/clip) so the reader feels *why* video needs different treatment.

- [ ] **Step 6: Write Section 5 — Study prompts**

~20 lines: questions ("Why does `try_consume` use `FOR UPDATE` instead of a read-then-write?", "What's the difference between `enforceFeature`, `enforceLimitImpl`, `enforceGenerationRate`, and `consumeQuota` — and when do you use each?", "If the Supabase RPC fails, should a pro user's request succeed or fail? Why?"), external concepts ("token-based pricing", "leaky bucket vs fixed window rate limiting", "AWS Step Functions for async media jobs", "OpenAI's spend-dashboard pattern"), experiments ("wire `consumeQuota('imageGen')` into `media.server.ts` following the roadmap's 6 steps", "add a token-count log to one agent call and estimate cost").

- [ ] **Step 7: Verify the doc**

- `grep -c "\.ts:\|\.sql:\|\.md:" docs/ai-engineering/06-cost-and-metering.md` — expect ≥ 8.
- `grep -c "Diverges from best practice" docs/ai-engineering/06-cost-and-metering.md` — expect ≥ 3.
- Section header count — expect 5.
- Spot-check 3 file:line references.
- Confirm the date claim "as of 2026-07-17" appears with the unmetered-media divergence.

- [ ] **Step 8: Commit**

```bash
git add docs/ai-engineering/06-cost-and-metering.md
git commit -m "docs(ai-eng): cost & metering"
```

---

## Task 8: Finalize the README and run full-set verification

**Files:**
- Modify: `docs/ai-engineering/README.md`

- [ ] **Step 1: Confirm all 6 deep-dives exist**

Run: `ls -1 docs/ai-engineering/`
Expected: `README.md` + six numbered files `01`–`06`.

- [ ] **Step 2: Add per-doc one-line summaries to the README**

Update the reading-order section so each link has a one-line summary (3–8 words) reflecting what each doc actually covers. Keep the existing reading order. Do not change the orientation or how-to-use sections — only enrich the link list.

- [ ] **Step 3: Link-integrity check**

Run: `rg -on "docs/ai-engineering/[0-9]+-[a-z-]+\.md" docs/ai-engineering/README.md` (or visually scan).
Expected: exactly 6 relative links, each pointing at a file that exists. Fix any broken links.

- [ ] **Step 4: File:line reference audit across the whole set**

Run: `rg -on "\b(src|supabase|docs)/[A-Za-z0-9_./-]+:[0-9]+" docs/ai-engineering/ | sort -u`
For each unique `file_path:line` reference, confirm:
- The file exists.
- The line number is within the file's current length (`wc -l < file`).
Fix any that are out of range. If a cited line has drifted (the line above/below now contains the claimed content), update the reference.

- [ ] **Step 5: Divergence-grep audit**

Run: `rg -c "Diverges from best practice" docs/ai-engineering/*.md`
Expected: ≥ 3 in each of files `01`–`06`; 0 expected in README (the README links to the callouts but doesn't make them). Fix any doc with fewer than 3.

- [ ] **Step 6: Template-adherence audit**

For each of `01`–`06`, confirm these 5 section headers appear (numbered exactly like this, in order):
- `## 1. The concept`
- `## 2. How we do it here`
- `## 3. The request flow`
- `## 4. Where we diverge from best practice`
- `## 5. Study prompts`

The per-task Steps 2–6 instruct writing each doc with these exact header strings. Run:

```bash
for f in docs/ai-engineering/0[1-6]*.md; do
  echo "== $f =="
  rg -c "^## [1-5]\. " "$f"
done
```

Expected: each file prints `5`. Any file printing fewer is missing a section — add it. The doc may have a top-level `#` title in addition (that's fine; it's not counted).

- [ ] **Step 7: No-duplication spot check**

Open `ARCHITECTURE.md` and `TECH_SPEC.md`. Confirm the new docs don't paraphrase their sections — they should cite concepts and link out, not restate. If any doc duplicates existing content, replace the duplication with a cross-reference.

- [ ] **Step 8: Confirm scope is unchanged**

Run: `git status`
Expected: only additions under `docs/ai-engineering/` and (already committed) the spec/plan files. No source code changes, no dependency changes, no edits to existing docs.

- [ ] **Step 9: Commit the finalized README**

```bash
git add docs/ai-engineering/README.md
git commit -m "docs(ai-eng): finalize index with per-doc summaries"
```

---

## Verification summary (the spec's "Verification plan")

The plan satisfies the spec's four verification requirements as follows:

1. **Link integrity** → Task 8 Step 3.
2. **Template adherence** → Task 8 Step 6 (plus per-task Step 7 checks).
3. **Divergence grep** → Task 8 Step 5 (≥ 1 per doc; the plan requires ≥ 3 per doc, exceeding the spec's "at least one").
4. **No duplication** → Task 8 Step 7.
5. **Build unaffected** → Task 8 Step 8 (`git status` shows markdown-only additions).

## Notes for the implementer

- **Re-verify is binding.** The spec's rule #2 ("re-verify before writing") is enforced by the Step 1 `rg` check in each task. Do not skip it; line numbers drift.
- **Parallelizable.** Tasks 2–7 are independent. If executing with subagents, dispatch them in parallel; each writes one file. Task 1 (README skeleton) must precede them; Task 8 (README finalize + audits) must follow.
- **No code changes.** If any task discovers a source-code bug worth fixing (e.g. the `planner.server.ts` regex), do NOT fix it in this PR — note it in the relevant doc's divergence callout and leave the fix for a separate change. These docs describe the system as it is.
- **Concept quality bar.** The Section 1 of each doc is where the actual AI-engineering learning lives. Write it as if for a smart SWE who has never heard the term before. Vocabulary first; define before use.
