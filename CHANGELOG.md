# Changelog

All notable changes to Allein will be documented here.

## [Unreleased]

### Added

- **Mastra AI framework integration** — `@mastra/core`, `@mastra/memory`, `@mastra/pg`, `@mastra/libsql`, `@mastra/observability`
  - Agents defined via `Agent` class with typed instructions, model, tools, and memory
  - 4-tier memory: last N messages + working memory (user profile) + semantic recall (vector search) + observational memory (background agent compression)
  - Tool system via `createTool()` from `@mastra/core/tools` with lifecycle hooks
  - Workflow engine ready for Phase 5 — `createWorkflow()` with `.then()`, `.parallel()`, `.branch()`, `.foreach()`
  - Observability via `@mastra/observability` — auto-traced agent runs, metrics, logs
- **`src/mastra/index.ts`** — central Mastra instance with conditional storage (`PgStore` for prod, `LibSQLStore` for dev), pgvector adapter, and observability config
- **`src/mastra/tools/`** — 10 tools organized into domain files:
  - `lead-tools.ts`: `createLead`, `createReminder`
  - `client-tools.ts`: `readClients`, `createClient`, `updateClient`, `deleteClient`
  - `task-tools.ts`: `createTask`, `readTasks`
  - `messaging-tools.ts`: `sendWhatsApp`, `sendTelegram`
- **`src/mastra/agents/`** — 6 agent classes with domain-specific instructions and per-agent tool selection:
  - `property-agent.ts` — real estate (CRM tools only)
  - `insurance-agent.ts` — insurance advisory (CRM tools only)
  - `car-dealer-agent.ts` — automotive sales (CRM tools only)
  - `travel-agent.ts` — travel concierge (CRM tools only)
  - `sales-agent.ts` — sales development (CRM + messaging tools)
  - `legal-agent.ts` — legal intake (CRM + task tools)
- **Per-agent working memory templates** — structured Markdown templates for user profile persistence (budget, preferences, case details, etc.)
- **Mastra Studio** — visual IDE at `localhost:4111` for debugging agents, inspecting traces, running workflows, and evaluating performance
- `SUPABASE_DATABASE_URL` env var — direct PostgreSQL connection string for Mastra storage (falls back to local LibSQL file)

### Changed

- `src/server/chat.server.ts` — refactored to use `getAgentByType().generate()` with Mastra memory system instead of manual `generateText()` with 20-message limit
  - Dynamic system prompt (user override + RAG + tool rules) passed as system message
  - Assistant reply saved to both Mastra memory (auto) and `messages` table (client display)
  - Tool results extracted from Mastra `result.steps` instead of manual `step.toolResults` iteration
- `src/server/chat-tools.ts` — restored to original `tool()` format for backward compatibility
- `.env` — added `SUPABASE_DATABASE_URL` and `MASTRA_PLATFORM_ACCESS_TOKEN` (both optional)

### Removed

- Direct `generateText()` import from `ai` package — now routed through Mastra `Agent.generate()`
- Manual 20-message conversation history loading — replaced by Mastra `Memory` with configurable `lastMessages`, `workingMemory`, `semanticRecall` options
