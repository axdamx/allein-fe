# 05 — Memory & Context

An LLM is stateless (doc 01 §1.1). Every call is independent. **Memory** is the
umbrella term for everything you do to make a stateless model behave as if it
remembers — recent turns, facts about the user, and relevant slices of the
distant past. This is the doc where that machinery gets unpacked.

> **Vocabulary-first.** Terms are defined the first time they appear, in
> **bold**.
>
> **Read this before doc 03.** Doc 03 covers retrieval over *documents* (RAG);
> this doc covers retrieval over *past conversation turns*. They share the
> same embedding math for different purposes, and people conflate them. This
> doc makes the distinction explicit.

---

## 1. The concept

### 1.1 Why "memory" is not one thing

When a user says "what's their phone number again?" mid-conversation, the model
needs three different kinds of context to answer well:

1. The **last few turns** of *this* conversation, so it knows who "their"
   refers to.
2. **Stable facts about the user** that emerged earlier — the user's name,
   preferences, the lead they're working on — in a compact form that doesn't
   require re-reading the whole transcript.
3. **Older conversations** with this user, where the phone number may have been
   mentioned a week ago.

These are three different problems with three different solutions. A mature
agent platform provides all three; the industry vocabulary for them is the
next three sections.

### 1.2 Short-term memory — recent turns

The simplest layer. The last N messages of the current conversation are
re-injected into the prompt before each model call. If the user said "my name
is Sam" two turns ago, that string is literally in the prompt, so the model
"knows" it.

This is the layer everyone implements first. The only design questions are
*how many* turns to keep and what to do when you exceed that (truncate, or
summarize). Frameworks usually call this option `lastMessages` or
`maxMessages`.

### 1.3 Working memory — the scratchpad

Short-term memory has a scaling problem: a long conversation has many turns,
and the older ones fall out of the window. If the user mentioned their budget
in turn 3 and you're on turn 25, it's gone — unless you extracted it.

**Working memory** (also called **scratchpad**, **profile memory**, or
**entity memory**) is a compact, structured summary of stable facts that the
model itself maintains across turns. At each turn, the model is given the
current scratchpad and may update it. The scratchpad is small (a few lines)
and re-injected every turn, so the facts survive beyond the `lastMessages`
window.

A common shape is a **template** the model fills:

```
# User Profile
- Name:
- Budget Range:
- Preferred Locations:
- Property Type Wanted:
- Timeline:
```

Each turn, the model sees this template (with whatever it has filled in so far)
and may add or update fields. The template both constrains what the model
tracks (only these slots) and prompts it to extract (empty slots are visible).

This is conceptually close to what the research literature calls **episodic +
semantic memory**: facts extracted from events, compressed into a stable form.

### 1.4 Long-term memory — semantic recall over past turns

The hardest layer. As conversations accumulate, you have hundreds or thousands
of past messages per user. You can't put them all in the prompt. **Semantic
recall** is the technique of embedding the current message, finding the most
semantically similar *past messages* across all of the user's threads, and
injecting those as context. If the user asks "what was that restaurant I
liked?", the recall layer finds the turn where they mentioned liking a
restaurant and surfaces it.

This is where memory and RAG (doc 03) are easy to conflate. The distinction:

- **Semantic recall (memory)**: vector search over *past conversation turns*
  in this product. Goal: "what did we say before?"
- **Document RAG**: vector search over *uploaded documents*. Goal: "what does
  this knowledge base say?"

Both use embeddings; both use vector stores; the *corpus* differs. A common
mistake is to call both "RAG." This doc says "recall" for the conversation
case and "RAG" for the document case.

### 1.5 Threads and resources

Memory is not global — it's scoped. The two scopes you'll see:

- A **thread** is one conversation. Short-term and working memory live here;
  the same user's two different chats don't share a transcript.
- A **resource** is the owner — typically the user. Long-term recall is often
  scoped per resource ("search this user's past messages"), and ownership for
  tool calls (doc 02 §2.2) flows from here.

So memory lookup is keyed by `(resource, thread)`: "give me the recent turns
and working memory for this user in this conversation, plus semantically
relevant past turns from any of this user's conversations."

### 1.6 Context window management

Everything in §1.2–§1.4 costs tokens. A model has a fixed **context window**
(the maximum number of tokens it can accept in one call). The art is fitting
the most useful context into that budget:

- System prompt: a few hundred tokens.
- RAG chunks (doc 03): up to a few thousand tokens.
- Short-term memory: grows with `lastMessages` × average message length.
- Working memory: a few hundred tokens.
- Semantic recall: a handful of retrieved turns × their `messageRange`.

If you're not careful, memory alone can consume the whole window. Frameworks
cap each layer; the agent author tunes the caps. **Summarization** — having a
smaller model compress old turns into a summary — is the more advanced
technique when capping isn't enough. We don't do it; see §4.

---

## 2. How we do it here

This codebase uses Mastra's `Memory` abstraction for all three layers on the
CRM agents, and a separate, manual mechanism for document RAG. The two are
**not the same code path**, even though both end up as text in the prompt.

### 2.1 The full Mastra `Memory` config (CRM agents)

`propertyAgent` is the reference; all six CRM agents (property, insurance,
car_dealer, travel, sales, legal) use an identical structure:

```ts
// src/mastra/agents/property-agent.ts:28-49
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: localEmbedder,
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Budget Range:
- Preferred Locations:
- Property Type Wanted:
- Timeline:
`,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
```

Mapping to §1's vocabulary:

- **`storage` + `vector`** — where memory is persisted. From
  `src/mastra/config.ts`: in production, `PostgresStore` + `PgVector` against
  the Supabase database; in dev, local LibSQL (`file:./mastra.db`). The switch
  is `process.env.SUPABASE_DATABASE_URL`.
- **`embedder: localEmbedder`** — the embedding model used by `semanticRecall`.
  This is the line that prevents the OpenAI-embedder trap (doc 03 §4). It is
  mandatory; omitting it makes recall call OpenAI. See §4 here too.
- **`lastMessages: 20`** — the short-term layer (§1.2). Always the last 20
  messages of this thread.
- **`workingMemory: { enabled, template }`** — the scratchpad (§1.3). The model
  fills this template each turn; the result is re-injected.
- **`semanticRecall: { topK: 3, messageRange: 2 }`** — the long-term layer
  (§1.4). On each turn, the top 3 most similar past messages are retrieved,
  each with 2 messages of surrounding context, and injected.

### 2.2 Per-vertical working-memory templates

Each CRM agent has its own scratchpad template reflecting its domain. Property
tracks `Budget Range` / `Preferred Locations` / `Property Type Wanted`; travel
tracks different fields; legal tracks different fields again. You can see them
all at:

```
src/mastra/agents/property-agent.ts:36-42
src/mastra/agents/insurance-agent.ts   (same structure, insurance fields)
src/mastra/agents/car-dealer-agent.ts
src/mastra/agents/travel-agent.ts
src/mastra/agents/sales-agent.ts
src/mastra/agents/legal-agent.ts
```

The templates are **hardcoded per agent file**. This is a deliberate,
domain-shaped choice — each vertical tracks the facts that matter for its
conversations.

### 2.3 The studio agent — memory deliberately stripped

The studio agent breaks the pattern. It keeps short-term memory and drops the
other two layers:

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

Two things this comment is doing:

1. **Avoiding the OpenAI-embedder trap.** Recall needs an embedder; if none is
   specified, Mastra defaults to OpenAI. The studio agent could have set
   `embedder: localEmbedder` like the CRM agents and gotten recall safely —
   but it doesn't, because:
2. **The studio workflow doesn't need recall.** Creative-generation sessions
   are typically short and self-contained; cross-conversation recall is low
   value. Dropping it entirely (rather than wiring it up safely) is the
   simpler choice. Whether that's the right call forever is a §4 question.

### 2.4 Thread and resource wiring at call time

The memory config above is per-agent. At call time, the *specific* thread and
resource are passed into `generate()`:

```ts
// src/server/chat.server.ts:364-376 (abridged)
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

Two lines doing real work:

- **`resource: user.id`** — this is the owner. It does double duty: it scopes
  which memory Mastra retrieves (this user's past turns), *and* it becomes
  `context.agent.resourceId` inside tool calls (doc 02 §2.2). The same value
  drives authorization for writes.
- **`thread: input.conversationId`** — the specific conversation. Short-term
  memory and working memory are scoped to this thread.

So memory lookup is keyed `(user.id, conversationId)`. A different conversation
for the same user gets a fresh short-term and working memory but can still
recall past turns across threads.

### 2.5 Document RAG is a separate, manual mechanism

Here's the conflation trap from §1.4 made concrete. The knowledge-base context
that users see in chat — "the agent knows about my uploaded documents" — is
**not** Mastra's `Memory`. It is manual prompt injection:

```ts
// src/server/chat.server.ts:270, 280-286 (abridged)
    const relevantChunks = await retrieveContext(input.content, agent.id, 5)
    // ...
    ragContext = `\n\n## Knowledge Base Context\n${relevantChunks
      .map((c, i) => `[Source ${i + 1}] (relevance: ${Math.round(c.similarity * 100)}%) ${c.text}`)
      .join('\n\n')}\nDo not claim knowledge that isn't in this context.`
```

`retrieveContext` (doc 03 §2.6) does its own embedding + vector search over
`document_chunks`. Its result is stringified into the system prompt alongside
everything else. Mastra's memory layers (short-term / working / recall) are
then added by the framework on top.

So the full context assembled for one CRM chat turn is, in order:

1. The dynamic system prompt (`dynamicPrompt`), itself built from
   `buildUserContext` (`chat.server.ts:57`) + date + DB-loaded agent
   instructions + RAG chunks + a tool-use directive.
2. Mastra's injected `lastMessages: 20`.
3. Mastra's injected `workingMemory` (filled template).
4. Mastra's injected `semanticRecall` results.
5. The current user turn.

That's five sources of context, assembled by two different code paths,
landing in one model call. The diagram in your head should be: *manual
prompt-building and framework-managed memory both feed the same prompt; they
do not know about each other.*

### 2.6 The same shape on the inbound/webhook path

The same assembly runs for inbound messages (WhatsApp/Telegram) in
`sendMessageForOwnerImpl`:

```ts
// src/server/chat.server.ts:546-548
        memory: {
          resource: input.ownerId,   // owner resolved from the channel
          thread: input.conversationId,
        },
```

Here there's no session user — the `resource` is resolved from the channel
(`telegram_chat_id` → owner). Everything else about memory is identical.

---

## 3. The request flow

One chat message, end to end, with the memory layers called out. (Overlaps
with doc 01 §3 and doc 03 §3; the new detail here is *when each memory layer
fires*.)

1. User sends a message → `sendMessageImpl` (`chat.server.ts:193`).
2. Quota check (`consumeQuota('messages')`, `chat.server.ts:211`).
3. Persist the user message.
4. **Document RAG** runs first: `retrieveContext(content, agent.id, 5)`
   (`chat.server.ts:270`). Returns up to 5 chunks (doc 03).
5. **Build the dynamic system prompt** (`chat.server.ts:295`): date + DB-loaded
   instructions + `buildUserContext` (`chat.server.ts:57`, the `## User
   Context` block from the profile) + `## Knowledge Base Context` (the RAG
   chunks) + the tool-use directive.
6. **Resolve the agent** via `getAgentByType(agent.type)` (`chat.server.ts:310`).
7. **`generate()` is called** (`chat.server.ts:364`) with `memory: { resource:
   user.id, thread: conversationId }`. *Now* Mastra's memory fires, inside the
   framework:
   - **Short-term**: loads the last 20 messages for `(user.id,
     conversationId)` and splices them between system and user messages.
   - **Working memory**: loads the current scratchpad (filled template) for
     this thread and includes it.
   - **Semantic recall**: embeds the current message with `localEmbedder`,
     finds top-3 similar past messages with 2-message ranges, includes them.
8. The model sees the full assembled context (steps 5 + 7) and generates.
9. Assistant reply + tool calls persisted; if working memory was updated by
   the model, Mastra persists that too for next turn.

The key insight: step 4 (RAG) and step 7 (recall) both retrieve via embeddings
but over different corpora. They are not redundant; one searches documents, the
other searches past conversations.

---

## 4. Where we diverge from best practice

Four divergences.

> ⚠️ **Diverges from best practice: the studio agent has no long-term memory.**
>
> **Best practice:** where a user expects continuity, offer it. At minimum,
> persist stable preferences across sessions via working memory.
>
> **What we do:** the studio agent has `lastMessages: 20` only
> (`studio-agent.ts:38-43`) — no working memory, no recall. Close and reopen a
> studio chat, and any preference the model had inferred is gone (the 20
> messages persist within the thread, but there's no scratchpad and no
> cross-thread recall).
>
> **Why:** avoiding the OpenAI-embedder trap by omission rather than by
> wiring `localEmbedder`, and a judgment that creative-generation sessions are
> short enough that cross-session continuity is low-value.
>
> **Verdict: acceptable trade-off, but worth revisiting.** The trap can be
> avoided the same way the CRM agents avoid it — set `embedder: localEmbedder`
> — which would let working memory and recall be enabled safely. If users
> start expecting "the studio remembers my brand colors," that's the path.

> ⚠️ **Diverges from best practice: `lastMessages: 20` is hardcoded across all
> agents.**
>
> **Best practice:** tune the short-term window per agent based on the typical
> conversation length and the model's context budget. A legal-intake agent may
> need 40 turns to keep a complex matter coherent; a car-dealer agent may be
> fine with 10.
>
> **What we do:** every agent uses `lastMessages: 20` (confirmed across all
> six CRM agent files + studio). One knob, one value.
>
> **Why:** one less thing to tune; 20 is a reasonable default that fits
> comfortably in the GLM context window alongside the other layers.
>
> **Verdict: acceptable.** If a specific agent starts showing "forgot what we
> were talking about" symptoms on longer conversations, raise its window
> individually. Until then, uniformity is a feature.

> ⚠️ **Diverges from best practice: working-memory templates are hardcoded per
> vertical.**
>
> **Best practice:** templates are data, configurable per deployment or per
> tenant, not baked into source.
>
> **What we do:** each agent file contains a literal `template: \`# User
> Profile ...\`` string (`property-agent.ts:36-42` and parallels). Changing
> what facts the property agent tracks means editing source and redeploying.
>
> **Why:** YAGNI. The templates are stable; making them data-driven is a
> setup-cost with no current payoff.
>
> **Verdict: acceptable.** Worth revisiting if this becomes a multi-tenant
> product where different customers want different slots tracked.

> ⚠️ **Diverges from best practice: memory vs RAG distinction is implicit in
> code organization.**
>
> **Best practice:** the two retrieval mechanisms (semantic recall over
> conversations; RAG over documents) should be visibly distinct in the code's
> structure, so a new contributor doesn't conflate them.
>
> **What we do:** they're split across locations — manual RAG injection in
> `chat.server.ts:270` (calling `retrieveContext` in `documents.server.ts`),
> framework-managed recall inside Mastra's `Memory` (configured in each
> `agents/*.ts`). There is no single place that says "here are the two
> retrieval mechanisms and how they differ." This doc is partly an attempt to
> fix that at the documentation layer.
>
> **Why:** the mechanisms evolved independently and live in different layers
> of the stack (one in app code, one in framework config).
>
> **Verdict: acceptable, with a documentation obligation.** Code organization
> is fine; the conceptual distinction needs to live somewhere a reader will
> find it. This doc, plus a short comment at the top of `chat.server.ts`
> pointing to it, would close the gap.

---

## 5. Study prompts

Self-test questions.

1. **The three layers, concretely.** You're on turn 30 of a property
   conversation. The user mentioned their budget (RM 800k) in turn 3. For each
   of the three memory layers — will the budget be in context on turn 30? If
   yes, via what mechanism? If no, why not?
2. **`resource` does double duty.** `memory.resource = user.id`
   (`chat.server.ts:371`) is used for two different things. Name them. (Hint:
   one is in this doc; one is in doc 02 §2.2.) What would break if you set
   `resource` to a constant?
3. **Recall vs RAG.** A user asks "what did we decide last week?" and the
   answer was in a *previous chat thread*, not an uploaded document. Which
   retrieval mechanism answers this — semantic recall or document RAG? Now
   flip it: "what does our refund policy say?" Which one answers that? Why
   can't one mechanism handle both well?
4. **The studio omission.** Suppose you wanted the studio agent to remember a
   user's brand colors across sessions. What's the minimum change to
   `studio-agent.ts` to enable that *safely* (without tripping the OpenAI
   trap)? Why is "set `embedder: localEmbedder`" safer than "leave it
   default"?
5. **Context budget.** Given: system prompt ~400 tokens, 20 short-term
   messages averaging 80 tokens, working memory ~100 tokens, recall top-3 with
   messageRange 2 (so up to 9 messages × 80 tokens), plus up to 5 RAG chunks ×
   ~400 tokens. Roughly how many tokens of context is that before the current
   turn? How does that compare to GLM's context window? Where would you cut
   first if you were running out?

**Experiments to run on this codebase:**

- **See all five context sources.** Add a `console.log(dynamicPrompt)` and a
  `console.log(JSON.stringify(await mastraAgent.generate(...)))` (or log
  `result.steps` after the call) in `sendMessageImpl`. Send a message in a
  conversation with some history and an uploaded document. You'll see the
  manual layers (system prompt, user context, RAG) and the framework layers
  (last 20, working memory, recall) side by side.
- **Make the studio agent remember.** Add `vector: vectorStore, embedder:
  localEmbedder` and a `workingMemory` template to `studio-agent.ts`. Restart
  and confirm the agent now persists scratchpad facts across turns in a
  thread. (Don't ship this without testing — confirm the embedder path works
  end-to-end.)
- **Demonstrate the OpenAI trap safely.** Create a throwaway agent with
  `semanticRecall` enabled but `embedder` *omitted*. Trigger a turn. Watch the
  error. This makes the §2.3 comment visceral. (Do this on a throwaway branch;
  revert after.)
- **Tune a window.** Pick the legal agent and raise its `lastMessages` to 40.
  Have a long conversation. Notice what stays in context that previously
  dropped out. Decide whether 40 is worth the token cost.

**External concepts to read up on** (search these names): **mem0** and
**LangGraph's memory primitives** for industry comparison; **episodic vs
semantic memory** (borrowed from cognitive science, now standard LLM-adjacent
vocabulary); **context window compression** and **conversation summarization**
— the pattern of periodically summarizing old turns into a compact "running
summary" to extend effective memory; the **Anthropic "context editing"** and
**OpenAI "memory"** features for how hosted products approach this; **entity
extraction-based memory** as an alternative to template-based working memory.
