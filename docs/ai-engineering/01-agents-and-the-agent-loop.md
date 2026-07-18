# 01 — Agents & the Agent Loop

This is the foundational doc. If you read only one, read this one. Everything
else (tool calling, memory, RAG, structured output, metering) is a refinement
of the loop described here.

> **Vocabulary-first.** Every term is defined the first time it appears, in
> **bold**. If a term is not defined before use, that is a bug in this doc.

---

## 1. The concept

### 1.1 What an LLM actually is

A **large language model (LLM)** is, at its core, a probabilistic
next-token predictor. You hand it a sequence of tokens (a "prompt"), and it
returns a probability distribution over the tokens that might come next.
Sampling from that distribution produces text. That is the entire trick.

Everything you think of as "reasoning", "knowledge", or "instruction
following" is an emergent property of predicting the next token over a very
large model trained on a very large corpus. There is no database lookup, no
clock, no filesystem, no ability to *do* anything. The model only emits
text.

This is the central limitation that motivates agents:

- The model is **stateless**. Every call is independent. It has no memory of
  the previous call unless you feed the previous transcript back in.
- The model **cannot take action**. It cannot query your database, send an
  email, create a lead, or check inventory. It can only produce strings.

An **agent** is the wrapper that removes both limitations: it gives the model
memory (by re-injecting past turns) and the ability to act (by letting the
model ask the surrounding code to run functions on its behalf).

### 1.2 The agent loop

The agent is a loop. Conceptually:

```
1. Assemble a prompt (system instructions + conversation history + new user turn)
2. Call the model
3. Did the model ask to call a tool?
   - YES: run the tool, append its result to the conversation, go to step 2
   - NO:  the model's text IS the final answer — return it
```

Vocabulary for this loop:

- A **tool** (also called a **function**) is a piece of code the agent host
  exposes to the model — e.g. `createLead(name, phone)` or
  `searchInventory(make, model)`.
- A **tool call** is the model's request to invoke a tool. The model does not
  run the tool itself; it emits a structured request naming the tool and its
  arguments. The host runs it.
- An **observation** (also called a **tool result**) is what the host hands
  back to the model after running the tool — the return value, serialized to
  text.
- One **iteration** (or **step**) is one pass through "model call → optional
  tool execution". A turn with no tool call is the final iteration.
- **maxSteps** is the iteration cap: the maximum number of model calls allowed
  in a single `generate()` invocation. We will explain why this exists in
  §1.4.

This pattern — "reason, act, observe, repeat" — is sometimes called the
**ReAct** loop after the paper that formalized it. Most agent frameworks
implement a variant of it.

### 1.3 Why agent frameworks exist

You can write the loop above by hand in 30 lines of TypeScript. So why do
frameworks like **Mastra**, **LangChain**, and the **Vercel AI SDK** exist?

Because the loop is the easy part. The hard parts are everything around it:

- **Tool schemas**: describing tools to the model in the format each provider
  expects (OpenAI's function-calling JSON, Anthropic's tool-use blocks, etc.).
- **Memory**: persisting conversation history, deciding how much to
  re-inject, optionally doing semantic recall over past threads.
- **Provider abstraction**: swapping the model behind the agent without
  rewriting the agent.
- **Streaming**: emitting tokens to the UI as they arrive instead of waiting
  for the full reply.
- **Structured output**: forcing the model to return valid JSON of a given
  shape.
- **Observability**: logging token counts, latency, and tool calls per step.

A framework is a set of conventions and adapters for these concerns. This
codebase uses **Mastra** (the registry/agent/memory abstractions) layered on
top of the **Vercel AI SDK** (the actual provider clients and tool-calling
wire format). We will see exactly where each layer starts and stops in §2.

### 1.4 Message roles and system prompts

A conversation is an ordered list of **messages**, each with a **role**. The
three roles you will see everywhere:

- **system** — instructions about how the model should behave across the whole
  conversation. Set once at the start. This is the **system prompt**: it is
  where you define the agent's persona, its task, its guardrails, and the
  rules for when to call tools.
- **user** — something the human said.
- **assistant** — something the model (or, historically, a human in that seat)
  said, including tool-call requests and the text of final answers.
- **tool** — the host-speakable role used to feed a tool's result back to the
  model. (Some APIs fold this into `assistant`; conceptually it is distinct.)

The system prompt is the single highest-leverage knob in agent design. A
one-line change to it can flip an agent from "asks clarifying questions" to
"calls the tool immediately with whatever it already knows." We will see a
real example of that knob in §2.

### 1.5 maxSteps / iteration caps

A model is allowed to call tools, and tool results feed back into the model,
which may call more tools. Without a cap, a confused model can loop forever:
call a tool, get a result, decide to call the same tool again, forever. Three
reasons every production agent sets a cap:

1. **Cost.** Each iteration is a billable model call with its own input and
   output tokens. An unbounded loop is an unbounded bill.
2. **Infinite loops.** Models do get stuck, especially on edge cases.
3. **Runaway tool chains.** Even when each individual call is reasonable,
   a 20-step chain rarely produces a better answer than a 3-step one, and it
   destroys latency.

The cap is the **maxSteps** parameter. When the host hits the cap, the loop
stops and returns whatever the last model call produced — usually a
half-finished answer. Choosing the cap is a per-agent tuning decision; in
this codebase it is `3` for CRM-style agents and `4` for the studio agent
(which often needs one extra step to call a media-generation tool). We will
cite both in §2.

---

## 2. How we do it here

Now the codebase. This section is a map: read it with the files open.
`ARCHITECTURE.md` §7 (Agent System) covers the *what* at a high level; this
section covers the *how* at the line level.

### 2.1 The Mastra registry

Every agent lives in a single registry constructed at module load:

```ts
// src/mastra/index.ts:22-34
export const mastra = new Mastra({
  storage,
  vectors,
  agents: {
    property: propertyAgent,
    insurance: insuranceAgent,
    car_dealer: carDealerAgent,
    travel: travelAgent,
    sales: salesAgent,
    legal: legalAgent,
    studio: studioAgent,
  },
})
```

Seven agents, keyed by **vertical** (the business domain: property,
insurance, etc.). The keys here (`property`, `studio`, …) are the canonical
identifiers the rest of the app uses to look an agent up.

Two accessors sit on top of the registry:

```ts
// src/mastra/index.ts:40-47
export function getAgentByType(type: string) {
  const id = `${type}-agent` as const
  try {
    return (mastra as any).getAgentById(id)
  } catch {
    return null
  }
}

/** The built-in Studio agent (conversational image/video generation). */
export function getStudioAgent() {
  return studioAgent
}
```

`getAgentByType` (`src/mastra/index.ts:40`) is the workhorse: it converts a
vertical key like `property` into the agent's Mastra id (`property-agent`) and
looks it up. Note the convention mismatch worth filing away: the registry key
is `property` but the agent's own `id` field is `property-agent` (see §2.2).
On a miss it returns `null` rather than throwing — the caller is expected to
surface a clean error to the user (see §3). `getStudioAgent`
(`src/mastra/index.ts:50`) is a direct import escape hatch for the studio
agent specifically, used outside the chat path.

### 2.2 The canonical CRM agent shape

`propertyAgent` is the reference implementation. Every CRM-style agent
follows this skeleton:

```ts
// src/mastra/agents/property-agent.ts:15-27
export const propertyAgent = new Agent({
  id: 'property-agent',
  name: 'Property Agent',
  instructions: `You are a property consultant AI. Help users find properties,
    qualify leads, schedule viewings, and answer questions about listings...`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool,
  },
  ...
})
```

The five fields map directly onto §1's vocabulary:

- `id` — the Mastra identifier, here `'property-agent'` (line 16). This is
  what `getAgentByType('property')` resolves to.
- `name` — the human label shown in UI.
- `instructions` — this agent's **system prompt**. We will see in §3 that it
  is *not* the only system text sent to the model; the server assembles a
  larger prompt around it at call time.
- `model` — which LLM to call. Always `getDefaultModel()` here (line 19);
  see §2.4.
- `tools` — the **tool** map exposed to the model. Doc 02 covers tools in
  depth; here, just notice the keys (`createLead`, etc.) are the names the
  model will use in **tool calls**.

The `memory` block on the same agent:

```ts
// src/mastra/agents/property-agent.ts:28-49
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: localEmbedder,
    options: {
      lastMessages: 20,
      workingMemory: { enabled: true, template: `# User Profile\n- Name: ...` },
      semanticRecall: { topK: 3, messageRange: 2 },
    },
  }),
```

This is how Mastra gives the model the **memory** §1.1 said it lacked:
`lastMessages: 20` re-injects the last 20 turns of the thread, and
`semanticRecall` pulls in older turns that are semantically similar to the
current message. Full treatment in doc 05 (Memory & context).

### 2.3 The studio agent variant

`studioAgent` keeps the same skeleton but diverges in two instructive ways.
First, its `instructions` are a real behavioral spec, not a one-liner:

```ts
// src/mastra/agents/studio-agent.ts:18-32
  instructions: `You are the Studio Agent — a senior creative director who
    helps users generate images and short videos for marketing and social media.

    Your job:
    1. Help the user articulate what they want. Ask 1-2 clarifying questions
       ONLY if the request is genuinely ambiguous; otherwise infer reasonable
       defaults.
    2. Craft strong, vivid generation prompts ...
    3. Call the right tool:
       - "make/generate/create an image/picture/..." → generate_image
       - "make/generate/create a video/clip/..."     → generate_video
       ...
    4. After generating, briefly describe what you made and offer one concrete
       next step ...`,
```

This is what a system prompt looks like when it is doing real work: it encodes
when to ask questions, how to map intent to a tool, and what to do after the
tool returns. Compare to the property agent's one-liner — the difference is
domain complexity, not framework capability.

Second, its memory is deliberately minimal — no vector store, no semantic
recall:

```ts
// src/mastra/agents/studio-agent.ts:35-43
  // NOTE: no `vector` / `semanticRecall` here — that path would call the
  // OpenAI embedding API and trip the "exceeded quota" error. The studio
  // agent doesn't need cross-conversation recall; lastMessages is enough.
  memory: new Memory({
    storage,
    options: {
      lastMessages: 20,
    },
  }),
```

The comment is the interesting part: semantic recall was *removed* because
the embedding call would hit a quota wall. That is a real engineering
trade-off logged in the code, not a design oversight. (Whether it should stay
that way is a divergence — see §4.)

### 2.4 The model provider

Both agents call `getDefaultModel()`. It lives here:

```ts
// src/lib/ai-provider.ts:21-29
export const provider = createOpenAICompatible({
  name: 'zai',
  baseURL,
  apiKey: process.env.LLM_API_KEY!,
})

/** Default model for chat + agent actions. */
export const DEFAULT_MODEL_ID =
  process.env.LLM_DEFAULT_MODEL || 'glm-4.5-flash'
```

`createOpenAICompatible` is the Vercel AI SDK's adapter for any provider that
speaks the OpenAI chat-completions wire format — here, **ZAI / Zhipu's GLM**.
`getDefaultModel()` (`src/lib/ai-provider.ts:39`) just returns
`provider(DEFAULT_MODEL_ID)`, i.e. "a model instance bound to
`glm-4.5-flash`".

One load-bearing comment in this file:

```ts
// src/lib/ai-provider.ts:12-16
// Suppress AI SDK warnings about unsupported provider features.
// ZAI/GLM doesn't support responseFormat (json_schema), but generateObject
// still works via prompt-based JSON fallback. This global must be set on
// globalThis, not process.env — the AI SDK checks the global directly.
;(globalThis as Record<string, unknown>).AI_SDK_LOG_WARNINGS = false
```

Translation: GLM does not reliably honor **`responseFormat`** (the
provider-side instruction to force valid JSON). The codebase works around
this with prompt-based JSON fallback rather than relying on the provider.
This matters for doc 04 (Structured LLM output); here, just note that *the
provider is not fully spec-compliant* and the code knows it.

### 2.5 The invocation

The actual `generate()` call — the one place the loop runs — is in the chat
server function:

```ts
// src/server/chat.server.ts:364-376
    result = await mastraAgent.generate(
      [
        { role: 'system' as const, content: dynamicPrompt },
        userMessage as never,
      ],
      {
        memory: {
          resource: user.id,
          thread: input.conversationId,
        },
        maxSteps: 3,
      },
    )
```

Three things to see here:

1. The two-element message array is the **system** + **user** pair from §1.4.
   Mastra's `memory` option will splice prior turns in *between* them.
2. `memory.resource` / `memory.thread` tell Mastra *which* memory to pull: a
   thread scoped to this user (`resource`) and this conversation (`thread`).
3. `maxSteps: 3` (`src/server/chat.server.ts:374`) is the iteration cap from
   §1.5. The model gets at most three model calls per turn. If it is mid-tool-
   chain on the third call, the loop stops and returns whatever it has.

Tool calls and results are extracted afterward from the `steps` array Mastra
returns:

```ts
// src/server/chat.server.ts:383-394
  const toolCalls: SendMessageResult['toolCalls'] = []
  const steps = result.steps ?? []
  for (const step of steps) {
    const toolResults = (step as any).toolResults ?? []
    for (const tr of toolResults) {
      const output = tr.output ?? tr.result ?? {}
      toolCalls.push({
        name: tr.toolName ?? tr.name ?? 'unknown',
        success: output?.success !== false,
        message: output?.message ?? output?.error ?? 'Completed',
      })
    }
  }
```

Each `step` corresponds to one **iteration** of the loop; its `toolResults`
holds the **observations** (tool return values) from that iteration. This
flattened list is what gets surfaced to the UI as "the agent did N things."

### 2.6 DB-seeded system prompts

The agent's `instructions` field in code is *not* the only place system text
comes from. The database also seeds per-type prompts:

```sql
-- supabase/migrations/0001_initial_schema.sql:631-663
insert into public.agent_types (key, label, description, icon, system_prompt,
                                default_tools, sidebar_items, sort_order)
values
  ('property', 'Property Agent', '...description...', 'home',
   'You are a property consultant AI. Help users find properties, qualify
    leads, schedule viewings, and answer questions about listings...',
   '["search_properties","schedule_viewing","qualify_lead"]'::jsonb, ...),
  ('insurance', ..., 'You are an insurance advisor AI...'),
  ('car_dealer', ..., 'You are an automotive sales AI...'),
  ('travel',    ..., 'You are a travel concierge AI...'),
  ('sales',     ..., 'You are a sales development AI...'),
  ('legal',     ..., 'You are a legal intake assistant AI...');
```

Six rows — `property`, `insurance`, `car_dealer`, `travel`, `sales`, `legal`.
Note **studio is not here**. The studio agent is code-only (see §2.3); the
six CRM types are DB-configurable via the `agent_types.system_prompt` column
(`supabase/migrations/0001_initial_schema.sql:144`). The `agents` table also
has a per-instance `system_prompt` override column
(`supabase/migrations/0001_initial_schema.sql:162`). We will see in §3 how
these three sources (code `instructions`, `agent_types.system_prompt`,
`agents.system_prompt`) are reconciled at call time.

---

## 3. The request flow

One chat message, end to end. Each step cites where it happens.

1. **Client posts.** The browser calls the `sendMessage` RPC
   (`src/server/chat.ts:84`), a TanStack Start `createServerFn` that
   immediately delegates to `sendMessageImpl`.
2. **Auth + quota gate.** `sendMessageImpl` (`src/server/chat.server.ts:193`)
   authenticates the user, then atomically consumes one message credit via
   `consumeQuota('messages')` (`src/server/chat.server.ts:211`). This runs
   *before* any LLM call — a denied quota never costs a token.
3. **Load conversation + agent.** Fetch the conversation row, verify
   ownership, then load the agent row (`type`, `system_prompt`, `model`).
4. **Persist the user message** (`src/server/chat.server.ts:255-262`) before
   generation, so a provider failure leaves a clean record rather than a
   half-broken turn.
5. **RAG retrieve.** `retrieveContext(input.content, agent.id, 5)`
   (`src/server/chat.server.ts:270`) pulls up to 5 relevant document chunks
   for the user's message. Full treatment in doc 03.
6. **Assemble the system prompt.** Three sources reconcile: the
   per-instance `agents.system_prompt` overrides `agent_types.system_prompt`
   (`src/server/chat.server.ts:239-247`); the result is wrapped with the
   date, user context, RAG context, and a tool-use directive into
   `dynamicPrompt` (`src/server/chat.server.ts:295-308`), which is then passed
   as the explicit system message to `generate()`
   (`src/server/chat.server.ts:366`). Note: the DB-loaded prompt that lands in
   `dynamicPrompt` is separate from the agent's code-level `instructions`
   field (§2.2). How Mastra combines an explicit system message with the
   agent's own `instructions` is framework behavior — worth confirming
   against the Mastra version in `package.json` if you are debugging prompt
   precedence (see study prompt 3).
7. **Resolve the agent.** `getAgentByType(agent.type)`
   (`src/server/chat.server.ts:310`); on `null`, bail with a clean error.
8. **Run the loop.** `mastraAgent.generate([system, user], { memory, maxSteps: 3 })`
   (`src/server/chat.server.ts:364`). This is the agent loop from §1.2,
   executed by Mastra. Up to 3 model calls, tool calls executed inside.
9. **Extract tool calls** from `result.steps[].toolResults`
   (`src/server/chat.server.ts:384-395`).
10. **Persist the assistant message** with token counts
    (`src/server/chat.server.ts:397-404`), return `{ reply, toolCalls, quota }`
    to the client.

A near-identical flow exists for inbound (WhatsApp/Telegram) messages in
`sendMessageForOwnerImpl` (`src/server/chat.server.ts:429`), which reuses the
same prompt assembly and the same `maxSteps: 3` call
(`src/server/chat.server.ts:540-552`). The studio chat path
(`src/server/studio-chat.server.ts:312`) is the same shape but with
`maxSteps: 4` (`src/server/studio-chat.server.ts:324`) — the extra step is
budget for the media-generation tool.

---

## 4. Where we diverge from best practice

Four divergences, each with: the best practice, what we do instead, why, and
a verdict.

> ⚠️ **Diverges from best practice: two parallel model-provider paths.**
>
> **Best practice:** one model-provider path. Every call goes through the
> same adapter so tool calling, streaming, structured output, and token
> accounting are uniform.
>
> **What we do:** two paths coexist. The modern one is
> `src/lib/ai-provider.ts` (Vercel AI SDK `createOpenAICompatible`,
> `getDefaultModel()` at line 39) used by every Mastra agent. The legacy one
> is `src/lib/ai.ts`, a hand-rolled `fetch` + SSE parser
> (`streamChatCompletion` at `src/lib/ai.ts:37`, `chatCompletion` at line
> 126) with its own `DEFAULT_MODEL` constant (line 17) and its own
> `ChatMessage` type (line 19). These paths share no code and can drift.
>
> **Why:** the legacy path predates the Mastra adoption and is still wired
> into non-agent call sites. Ripping it out is a refactor no one has
> scheduled.
>
> **Verdict: tech debt.** Until the legacy path is deleted, any change to
> provider config (base URL, default model, auth) has to be made in two
> places and they can silently disagree.

> ⚠️ **Diverges from best practice: non-streaming `.generate()` for chat.**
>
> **Best practice:** stream tokens to the UI as they arrive so the user sees
> progressive output and the perceived latency is the time-to-first-token,
> not the time-to-full-reply.
>
> **What we do:** `mastraAgent.generate(...)` (`src/server/chat.server.ts:364`)
> returns the full reply as one string; the client then does "progressive
> text reveal" locally (`src/hooks/use-studio-chat.ts:5` notes this). No
> token is sent to the browser until the entire loop finishes.
>
> **Why:** simpler error handling, simpler persistence (one insert at the
> end), and Mastra's streaming + tool-calling + memory combination was
> rougher at the time this was written.
>
> **Verdict: acceptable trade-off with real UX cost.** A long tool chain
> (up to 3 model calls) means the user stares at a spinner for the whole
> turn. Worth revisiting once streaming is prioritized; the framework
> supports it.

> ⚠️ **Diverges from best practice: observability disabled.**
>
> **Best practice:** every agent call emits token counts, latency, and tool
> traces to an observability backend so you can see what the model actually
> did and what it cost.
>
> **What we do:** Mastra's built-in observability is explicitly turned off,
> with the reason in a comment:
>
> ```ts
> // src/mastra/index.ts:14-20
> // NOTE: Mastra observability is disabled. The MastraStorageExporter tries to
> // batch-write metrics (token counts, latency) into PostgresStore, but
> // @mastra/pg doesn't implement the batch-metrics API — so every call logged
> // "This storage provider does not support batch creating metrics". ...
> ```
>
> **Why:** the default exporter was broken against our storage adapter — it
> logged a useless warning on every call. Rather than ship noise, it was
> disabled. Token counts are still captured per-message at the call site
> (`src/server/chat.server.ts:402-403`), so the data exists, just not in a
> tracing system.
>
> **Verdict: tech debt.** This is the single biggest visibility gap in the
> agent layer. Cross-reference doc 06 (Cost & metering) for the economic
> implications and the fix (OTLP/console exporter or Mastra Cloud).

> ⚠️ **Diverges from best practice: prompts assembled inline in server code.**
>
> **Best practice:** prompts are versioned assets — files (or DB rows with a
> version) you can diff, A/B, and roll back without a code change.
>
> **What we do:** the runtime system prompt is built by string concatenation
> inside `sendMessageImpl` (`src/server/chat.server.ts:295-308`), mixing the
> date, the DB-loaded prompt, user context, RAG context, and a hardcoded
> tool-use directive (`"!!! ABSOLUTE RULE: NEVER ask the user for
> details..."`) into a template literal in TypeScript. The DB-seeded prompts
> in `supabase/migrations/0001_initial_schema.sql:631` are versioned only by
> migration file.
>
> **Why:** iteration speed. While prompt wording changes weekly, inlining it
> keeps the feedback loop tight (edit, save, hot-reload).
>
> **Verdict: acceptable until iteration is frequent — and it is frequent.**
> The right time to extract prompts into a versioned store is when you start
> A/B-testing them or when non-engineers need to edit them. Until then, the
> inline form is a deliberate, defensible choice.

---

## 5. Study prompts

Self-test questions. Answer before peeking at the cited lines.

1. **maxSteps behavior.** Under `maxSteps: 3` (`src/server/chat.server.ts:374`),
   what happens if an agent calls a tool on iteration 1, another on iteration
   2, and tries to call a third on iteration 3? What does `result.text`
   contain, and what does the user see?
2. **Null vs throw.** Why does `getAgentByType` (`src/mastra/index.ts:40-47`)
   return `null` instead of throwing on a miss? Trace the caller
   (`src/server/chat.server.ts:310-313`) and explain what would break if it
   threw.
3. **Prompt precedence.** Three sources of system text — the agent's
   code-level `instructions` (e.g. `property-agent.ts:18`), the
   `agent_types.system_prompt` DB seed (`0001_initial_schema.sql:644`), and
   the per-instance `agents.system_prompt` override. Which wins, and where in
   the code is that decided?
4. **The two model paths.** Name one concrete risk of keeping both
   `src/lib/ai-provider.ts` and `src/lib/ai.ts`. (Hint: read each file's
   default-model constant.)
5. **Why studio is `maxSteps: 4`.** Compare `chat.server.ts:374` to
   `studio-chat.server.ts:324`. What about the studio workflow justifies the
   extra step?

**Experiments to run on this codebase:**

- Set `maxSteps: 1` in `sendMessageImpl` and send a message that obviously
  requires a tool call (e.g. "create a lead for John at 555-0100"). Observe
  what the agent returns — this is what "hit the cap mid-chain" looks like.
- Temporarily change the property agent's `instructions` in
  `property-agent.ts:18` to forbid tool calls entirely. Confirm the loop
  terminates after one iteration with a text-only answer — proving the
  loop's exit condition is "no tool call," not "model says done."

**External concepts to read up on** (search these names): the ReAct paper
(reason + act); "function calling vs tool calling" naming (they are the same
thing across providers); "streaming vs batch generation" trade-offs
(time-to-first-token vs implementation complexity); the system / user /
assistant message-role convention from the OpenAI chat-completions spec.
