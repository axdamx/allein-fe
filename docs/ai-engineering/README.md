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
