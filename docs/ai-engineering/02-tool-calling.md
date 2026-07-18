# 02 — Tool Calling

Doc 01 covered the agent loop. This doc zooms in on the moment the model
decides to *act* — to call a **tool** instead of producing a final text answer.
That moment, and the code that runs when it happens, is where an LLM goes from
"generates strings" to "takes actions in your system."

> **Vocabulary-first.** Terms are defined the first time they appear, in
> **bold**.

---

## 1. The concept

### 1.1 What tool calling is

**Tool calling** (also called **function calling**) is the protocol by which the
model requests that a piece of code be executed on its behalf. Instead of
emitting prose, the model emits a structured request: a tool name plus a set of
typed arguments. The host framework validates the arguments, runs the named
function, and feeds the return value back to the model as an observation.

This is distinct from the agent loop (doc 01 §1.2), though they cooperate. The
**loop** is the orchestration pattern ("reason, act, observe, repeat"). **Tool
calling** is the mechanism the "act" step uses. You can have tool calling
without an agent loop (a single model call that decides to call one tool, then
stops), and in principle an agent loop without tool calling (one that only ever
produces text). In practice they go together.

### 1.2 Why typed schemas beat parsing the model's prose

The naive alternative to tool calling is to instruct the model: "When you want
to create a lead, reply with `CREATE_LEAD: name=..., email=...`" and then parse
that string with a regex. This works for demos and breaks in production:

- The model adds prose around the marker ("Sure! `CREATE_LEAD: ...`").
- It quotes values inconsistently (`email="x"` vs `email=x`).
- It omits fields it considers obvious.
- It hallucinates fields you didn't ask for.

**Tool calling** solves this by giving the model a contract before it generates
anything. You declare each tool with a **schema** (a typed description of its
name, arguments, and their types — usually JSON Schema, in our case Zod). The
model is then constrained to emit a tool call whose arguments validate against
that schema. The framework, not your regex, does the parsing and validation.

The schema has two jobs. It is a **type contract** (the runtime guarantee), and
it is a **prompt** (the model reads `description` fields on the tool and its
parameters to decide *whether* and *how* to call). Good tool design is mostly
good prompt design embedded in the schema.

### 1.3 The flow, in detail

1. The host sends the model a list of available tools (name + schema + description).
2. The model generates. It either produces a normal text answer, or it produces
   one or more **tool calls** — structured requests like
   `{tool: "createLead", args: {name: "John", email: "..."}}`.
3. If tool calls were produced, the framework **validates** each call's args
   against the schema.
4. The framework **executes** the tool's handler with those args, plus a
   **context** object carrying metadata (in Mastra: the calling agent, the
   owner/resource, the thread).
5. The handler's return value is serialized to text and sent back to the model
   as an **observation**.
6. The model generates again, now informed by the observation. Go to step 2.

### 1.4 Side effects, idempotency, and safety

Tools that read data are safe to call freely. Tools that **write** — create a
lead, send a message, generate a billed image — are not. Three concerns dominate
production tool design:

- **Side-effect safety.** A tool that sends an SMS cannot be un-sent. The model
  will sometimes call a tool you didn't expect; the schema's `description` is
  your main lever to prevent that, but it is not a guarantee.
- **Idempotency and retry.** If the network blips between the model emitting a
  tool call and the handler completing, did the side effect happen once, twice,
  or never? Idempotent tools (e.g. upsert by key) are safe to retry;
  non-idempotent tools (e.g. insert) are not.
- **Authorization.** The model is not trusted. It must not be able to act on
  data belonging to a user other than the one who initiated the request. The
  handler — not the model — must decide *whose* data the call touches, and that
  decision must come from server-injected context, never from the model's
  arguments.

### 1.5 Where tools fit in the architecture

Tools are the seam between the language model and your real system (database,
external APIs, file storage). Because they are the seam, two things follow:

1. Tool handlers are where most of your actual business logic lives in an
   agent-based app. The model is the decision-maker; the tools do the work.
2. Tool handlers are where most of your security and quota enforcement has to
   live, because they are the only place that knows both *what* the model
   decided to do and *who* asked.

This codebase leans hard on that second point, as we will see in §2 and flag in
§4.

---

## 2. How we do it here

`docs/ai-engineering/01-agents-and-the-agent-loop.md` covered the agent
registry. Tools live in a parallel directory, `src/mastra/tools/`, and are wired
into each agent's `tools` map. There are five tool files:

- `lead-tools.ts` — `createLeadTool`, `createReminderTool`
- `client-tools.ts` — `readClientsTool`, `createClientTool`, `updateClientTool`,
  `deleteClientTool`
- `task-tools.ts` — `createTaskTool`, `readTasksTool`
- `messaging-tools.ts` — `sendWhatsAppTool`, `sendTelegramTool`
- `studio-tools.ts` — `generateImageTool`, `generateVideoTool`,
  `analyzeImageTool`

### 2.1 The `createTool` + Zod pattern

Every tool uses the same shape. The reference example is `createLeadTool`:

```ts
// src/mastra/tools/lead-tools.ts:5-15
export const createLeadTool = createTool({
  id: 'create-lead',
  description:
    'Save a contact as a new lead in the CRM. Use when the user wants to add, save, ' +
    'or record a person/prospect. PROACTIVELY extract name, email, phone, company ' +
    'from the conversation context — do NOT ask the user for details they already provided.',
  inputSchema: z.object({
    name: z.string().describe('Full name of the contact. Derive from email if not given.'),
    email: z.string().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
    company: z.string().optional().describe('Company name'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  // ... execute
})
```

Three things to see:

- `id` — the stable identifier Mastra uses.
- `description` — **this is what the model reads**. It is prompt engineering
  embedded in the schema. Note the loaded phrase "PROACTIVELY extract ... from
  the conversation context — do NOT ask the user for details they already
  provided." That single sentence changes user-facing behavior: the agent fills
  in fields from prior conversation turns instead of asking redundant questions.
- `inputSchema` — a **Zod** schema. Zod is both a runtime validator and (via
  `.describe()`) more prompt. The `.describe()` strings on each field tell the
  model what to put there.

The handler:

```ts
// src/mastra/tools/lead-tools.ts:16-25
  execute: async ({ name, email, phone, company, notes }, context) => {
    const ownerId = context?.agent?.resourceId
    const supabase = getSupabaseServiceClient()

    const { enforceLimitImpl } = await import('@/server/profile.server')
    try {
      await enforceLimitImpl('leads')
    } catch {
      return { success: false, error: 'Lead limit reached on your current plan.' }
    }
    // ... insert
```

Two patterns worth filing away — both have their own sections below. Line 17
reads ownership from `context.agent.resourceId`. Line 22 enforces the plan limit
*inside the tool*, before the write. We unpack both in §2.2 and §2.3.

### 2.2 Ownership scoping — `context.agent.resourceId`

This is the single most important security pattern in the tool layer:

```ts
// src/mastra/tools/lead-tools.ts:17
const ownerId = context?.agent?.resourceId
```

`resourceId` is the **owner** — the user whose data this call is allowed to
touch. It is **not** passed by the model. It is injected by the server function
that started the agent run, via the `memory.resource` option on `generate()`
(see `src/server/chat.server.ts:359-362`, covered in doc 01 §3 and doc 05). By
the time the model decides to call `createLead`, `resourceId` is already set to
the authenticated user's id; the model cannot influence it.

Every write tool uses `resourceId` as the row's `owner_id`:

```ts
// src/mastra/tools/client-tools.ts:71-77
    const resourceId = context?.agent?.resourceId
    // ...
      .insert({
        owner_id: resourceId,
        // ...
```

And every read tool scopes its query by it:

```ts
// src/mastra/tools/client-tools.ts:17-23
    const resourceId = context?.agent?.resourceId
    // ...
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('owner_id', resourceId)
```

This matters because the tools use the **service-role** Supabase client:

```ts
// src/mastra/tools/lead-tools.ts:18
const supabase = getSupabaseServiceClient()
```

The service role bypasses Row-Level Security (RLS). So `resourceId` is not
defense-in-depth on top of RLS — in the tool layer, `resourceId` is *the only
thing* scoping the write. §4 has the divergence callout.

### 2.3 In-tool plan gating

Quota and feature enforcement happens *inside* the tool handler, not just at
the chat boundary:

```ts
// src/mastra/tools/lead-tools.ts:20-25
    const { enforceLimitImpl } = await import('@/server/profile.server')
    try {
      await enforceLimitImpl('leads')
    } catch {
      return { success: false, error: 'Lead limit reached on your current plan.' }
    }
```

Note the shape: when the limit is exceeded, the tool returns
`{success: false, error: ...}` — it does **not** throw. That choice matters.
Throwing inside a tool handler surfaces to the agent as a runtime error; the
agent may retry, may apologize, may produce a confusing reply. Returning a soft
failure lets the agent read the message and relay it cleanly: "It looks like
you've hit your lead limit for the Free plan — upgrade to add more."

The studio tools extend the same idea with feature-flag gating:

```ts
// src/mastra/tools/studio-tools.ts:97-104
    const ownerId = context?.agent?.resourceId
    // ...
    const allowed = await ownerHasFeature(ownerId, 'aiImageGen')
    if (!allowed) {
      return { success: false, error: 'Image generation requires the Pro plan.' }
    }
```

`ownerHasFeature` (defined at `src/mastra/tools/studio-tools.ts:29`) reads the
owner's plan and checks the boolean feature flag in `PLAN_CONFIGS` (see doc 06).
Same soft-failure pattern: the studio agent's prompt is explicitly instructed
to relay these plan messages kindly rather than pretending the generation
succeeded (`src/mastra/agents/studio-agent.ts:28`).

### 2.4 SSRF guarding on model-supplied URLs

Some tools take a URL from the model's arguments (image-to-video source, image
to analyze). The model could be prompted — including via prompt injection in
uploaded content — to point at an internal address (`http://localhost`, an AWS
metadata endpoint, a private IP). Every model-supplied URL is therefore
validated before it is fetched:

```ts
// src/mastra/tools/studio-tools.ts:195
          assertSafeUrl(image_url)
```

`assertSafeUrl` lives at `src/lib/url-guard.ts:49`. It rejects non-`http(s)`
schemes, loopback/private/link-local IPs, and a blocklist of internal hosts.
The same guard is applied to `analyzeImageTool`'s input
(`src/mastra/tools/studio-tools.ts:250`). This is a defense against one
specific prompt-injection class — internal host targeting — and is worth
knowing about even though a full AI-security doc is out of scope here.

### 2.5 Multimodal input — `analyzeImageTool`

The analyze tool shows the pattern for handing the model an image alongside
text. It uses the Vercel AI SDK's `generateText` directly (no agent loop), with
a multimodal content array:

```ts
// src/mastra/tools/studio-tools.ts:261 (simplified)
              { type: 'image', image: new URL(image_url) },
```

The interesting bit is what you don't see in the simplified excerpt: in the
actual source this content array is cast `as never`. Mastra's types for message
content are stricter than the AI SDK's, and the runtime shape is correct but
the types disagree. §4 flags this as fragile typing debt.

### 2.6 The full CRM toolset, briefly

Every CRM vertical agent gets the same six tools from `lead-tools.ts` +
`client-tools.ts` (create/read/update/delete clients + create lead + create
reminder). Two agents add more:

- `sales-agent` adds `sendWhatsAppTool` and `sendTelegramTool`
  (`src/mastra/tools/messaging-tools.ts:5`, `:37`) — sales needs outbound
  messaging.
- `legal-agent` adds `createTaskTool` and `readTasksTool`
  (`src/mastra/tools/task-tools.ts:5`, `:41`) — legal intake produces tasks.

The studio agent gets only `studioTools`
(`src/mastra/tools/studio-tools.ts:280-283`): `generate_image`,
`generate_video`, `analyze_image`.

---

## 3. The request flow

One tool call, end to end. The user types "save John as a lead, john@acme.com":

1. The message reaches `sendMessageImpl` (`src/server/chat.server.ts:193`),
   passes the quota gate, gets persisted.
2. The system prompt is assembled and the agent is resolved via
   `getAgentByType(agent.type)` (`src/server/chat.server.ts:310`).
3. `agent.generate([system, user], { memory: { resource: user.id, thread }, maxSteps: 3 })`
   is called (`src/server/chat.server.ts:364`). At this point
   `memory.resource = user.id` is what later becomes `resourceId` inside tools.
4. The model reads the tool descriptions (including `createLeadTool`'s
   "PROACTIVELY extract..." instruction) and emits a tool call:
   `{name: "createLead", args: {name: "John", email: "john@acme.com"}}`.
5. Mastra validates the args against the Zod `inputSchema`. (If the model had
   omitted `email`, the call would fail validation here.)
6. `createLeadTool.execute` runs:
   - Reads `ownerId = context.agent.resourceId` (= the authenticated user).
   - Calls `enforceLimitImpl('leads')` (`lead-tools.ts:22`).
     - If exceeded → returns `{success: false, error: 'Lead limit reached...'}`,
       fed back to the model as the observation; the agent relays it. End.
   - Inserts the lead via the service-role client, scoped by `owner_id`.
   - Returns `{success: true, leadId, message: 'Lead "John" created successfully'}`.
7. The observation is appended. The model generates again — this time a text
   answer with no tool call: "Saved John as a new lead."
8. Back in `sendMessageImpl`, the tool call is extracted from
   `result.steps[].toolResults` (`src/server/chat.server.ts:383-394`) and
   returned to the client alongside the reply.

The whole thing is one iteration of the loop from doc 01 §1.2, with the tool
call as the "act" step and the insert result as the "observe" step.

---

## 4. Where we diverge from best practice

Four divergences.

> ⚠️ **Diverges from best practice: no retry on transient tool failures.**
>
> **Best practice:** for *idempotent* tools, retry transient failures (network
> blip, DB timeout, 5xx from a dependency) with exponential backoff before
> surfacing the error. Distinguish transient from permanent failures.
>
> **What we do:** any insert error returns `{success: false, error: 'Operation failed'}`
> (`src/mastra/tools/lead-tools.ts:42`, same shape in `client-tools.ts:94`,
> `task-tools.ts`). The generic message is returned to the model verbatim; the
> agent relays "Operation failed" or paraphrases it.
>
> **Why:** most failures in practice are quota (`enforceLimitImpl`) or
> constraint violations (duplicate email), not transient. Retrying those would
> be wrong. Simplicity wins at current scale.
>
> **Verdict: acceptable, with a real cost.** A flaky Supabase connection
> surfaces to the user as a confusing "Operation failed" instead of being
> masked by a retry. When reliability complaints appear, this is the first
> place to look — add a retry wrapper that only retries idempotent *reads*
> (`readClientsTool`, `readTasksTool`) and known-idempotent writes.

> ⚠️ **Diverges from best practice: service-role client in tools (RLS bypassed).**
>
> **Best practice:** defense in depth — Row-Level Security at the database
> enforces ownership, and the application layer re-checks. A bug in app-level
> scoping is caught by RLS.
>
> **What we do:** tools call `getSupabaseServiceClient()`
> (`src/mastra/tools/lead-tools.ts:18`, every tool file), which uses the
> service role and bypasses RLS. `resourceId` is the *only* thing scoping the
> write or read.
>
> **Why:** the model runs server-side under an authenticated session; the
> service role avoids per-query RLS overhead; and per-query RLS based on the
> session user is awkward when the agent is invoked from an inbound webhook
> (`sendMessageForOwnerImpl`, `src/server/chat.server.ts:429`) where there is
> no session user — only an `owner_id` resolved from the channel.
>
> **Verdict: acceptable *only because* `resourceId` is server-injected and
> never model-controlled.** This is an invariant you must not break. If any
> tool ever accepted an `ownerId` or `userId` from the model's arguments and
> used it for scoping, the service-role bypass would become a cross-tenant
> data leak. The convention should be documented loudly at the tool-file
> boundary; right now it is implicit.

> ⚠️ **Diverges from best practice: `as never` casts for multimodal content.**
>
> **Best practice:** types match the framework's expected shape; if they don't,
> fix the types or upgrade the framework.
>
> **What we do:** multimodal image content is cast `as never` to satisfy
> Mastra's stricter message-content types
> (`src/mastra/tools/studio-tools.ts` around the `analyzeImageTool` content
> array; same pattern in `src/server/chat.server.ts` and
> `studio-chat.server.ts` for attachment content).
>
> **Why:** the runtime shape is correct (the Vercel AI SDK accepts it); only
> the TypeScript types disagree between Mastra and the AI SDK. The cast makes
> the compiler happy without changing behavior.
>
> **Verdict: tech debt.** `as never` is the heaviest possible escape hatch and
> will silently swallow future type errors in that expression. Fragile to
> framework upgrades. Fix when you next touch these files: either align to
> Mastra's expected type or open an issue upstream.

> ⚠️ **Diverges from best practice: inconsistent gating idioms across tools.**
>
> **Best practice:** one gating mechanism. Every side-effecting tool calls the
> same helper in the same way.
>
> **What we do:** CRM tools call `enforceLimitImpl(metric)` directly inside
> `execute` (`lead-tools.ts:22`). Studio tools call a local `ownerHasFeature`
> helper (`studio-tools.ts:29`) that checks a boolean feature flag. Two
> patterns, two files, two error-message conventions.
>
> **Why:** CRM tools gate on *counts* (leads, clients) which is what
> `enforceLimitImpl` does; studio tools gate on *booleans* (is this tier
> allowed to generate media at all) which is what `ownerHasFeature` does. The
> two helpers do genuinely different things, so the split is defensible — but
> the surface inconsistency makes the tool layer look less uniform than it is.
>
> **Verdict: acceptable, minor.** Worth a short doc-comment at the top of each
> tool file explaining which gate it uses and why.

---

## 5. Study prompts

Self-test questions. Answer with the cited lines open.

1. **Soft failure vs throw.** Why does `createLeadTool` `return {success: false}`
   on quota exceed (`src/mastra/tools/lead-tools.ts:22-25`) instead of
   re-throwing? Trace what the agent would do in each case. What does the user
   see?
2. **The `resourceId` invariant.** Suppose a new tool accepted `ownerId` as a
   model argument (`inputSchema: z.object({ ownerId: z.string() })`) and used
   it for the `owner_id` insert. What specifically breaks, given that the tool
   uses the service-role client? How would you exploit it as an attacker who
   can craft prompts?
3. **Schema as prompt.** Read the `description` on `createLeadTool`
   (`lead-tools.ts:7-9`). Now read it on `createReminderTool` (`lead-tools.ts:53-55`).
   What behavior do the "PROACTIVELY extract..." / "do NOT ask..." phrases
   produce? Remove them locally and test — how does the agent's behavior
   change?
4. **SSRF defense.** What classes of URL does `assertSafeUrl`
   (`src/lib/url-guard.ts:49`) block, and what classes does it *not* block?
   (Hint: what about a public URL that redirects to a private IP?) Why is this
   guard applied to `generateVideoTool` and `analyzeImageTool` but not to
   `createLeadTool`?
5. **Why studio doesn't gate inside the chat boundary.** Compare how a lead
   gets gated (inside `createLeadTool`) to how an image generation gets gated
   (`generateImageTool`, `studio-tools.ts:100`). Both are in-tool. Now find
   where the studio *chat* boundary gates — and notice that media generation is
   gated by feature flag in two places (here AND in `src/server/media.ts`).
   Why the redundancy?

**Experiments to run on this codebase:**

- Add a retry wrapper around the Supabase insert in `readClientsTool` (an
  idempotent read). Use a forced timeout to confirm it now masks one blip.
  Then try the same wrapper on `createLeadTool` (non-idempotent) and observe
  why naive retry is wrong there.
- Add a deliberate bug: change `createLeadTool` to read `ownerId` from the
  model's arguments instead of `context.agent.resourceId`. Write a prompt that
  exploits it to insert a lead under a different `owner_id`. This makes the
  security invariant visceral.
- Write a new tool that calls an external API (use a mock). Add `assertSafeUrl`
  on every URL it accepts, then try to make the model pass a `file://` or
  `http://169.254.169.254` URL via prompt injection.

**External concepts to read up on** (search these names): JSON Schema for
function calling; the difference between OpenAI's "function calling" and
Anthropic's "tool use" wire formats; idempotency keys (Stripe's pattern is the
classic reference); the OWASP LLM Applications Top 10 — specifically
**LLM02: Insecure Output Handling** and **LLM01: Prompt Injection**, which
together explain why model-controlled arguments must never be trusted for
authorization.
