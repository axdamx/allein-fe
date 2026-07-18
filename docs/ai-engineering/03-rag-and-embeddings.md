# 03 — RAG & Embeddings

So far the agents we've described know only what is in their system prompt and
their recent conversation history. None of that is *your* data — your product
catalog, your policies, the PDF a user uploaded. **RAG** (Retrieval-Augmented
Generation) is how you give a model access to a large body of text without
stuffing all of it into the prompt.

> **Vocabulary-first.** Terms are defined the first time they appear, in
> **bold**.
>
> **Read doc 05 first if you haven't.** This doc covers retrieval over
> *documents*. Doc 05 covers retrieval over *past conversations*. They use the
> same embedding math for different purposes, and the distinction matters.

---

## 1. The concept

### 1.1 What an embedding is

An **embedding** is a fixed-length list of numbers (a vector) that represents
the *meaning* of a piece of text. The key property: text that means similar
things gets vectors that are close together in the vector space; text that
means different things gets vectors that are far apart.

Concretely, a sentence like `"how do I reset my password"` and a sentence like
`"I forgot my login credentials"` will have vectors that are close, even though
they share almost no words — because a well-trained embedding model has learned
that those phrases are used in the same situations. This is the trick that lets
you search by *meaning* instead of by keyword.

Embeddings are produced by an **embedding model**. You feed text in, you get a
vector out. The dimensionality (length of the vector) depends on the model:
small fast models produce ~384-dimensional vectors; large models like OpenAI's
`text-embedding-3-small` produce 1536-dimensional vectors.

### 1.2 Vector similarity

To find "which stored texts are most similar to this query," you need a notion
of distance between two vectors. The standard one for normalized embeddings is
**cosine distance**: `1 - cosine_similarity`. In SQL (with pgvector), the `<=>`
operator computes it. Distance is 0 for identical, up to 2 for opposite;
**similarity** is `1 - distance`, so it's 1 for identical down toward -1.

For **L2-normalized** vectors (magnitude 1, which embedding models produce by
default), cosine similarity reduces to a simple dot product — which is why most
embeddings ship pre-normalized.

### 1.3 Why a vector database

To answer a query you need to compare the query vector against every stored
chunk vector and return the closest ones. With 1,000 chunks that's fine to do
in memory; with 10 million it isn't. A **vector database** (pgvector, Pinecone,
Weaviate, Qdrant) indexes the vectors so nearest-neighbor search is
sub-linear rather than O(n). The two index families you'll hear about:

- **HNSW** (Hierarchical Navigable Small World) — graph-based, fast queries,
  higher memory, slower inserts. pgvector supports it via
  `using hnsw (col vector_cosine_ops)`.
- **IVF** (Inverted File) — cluster-based, lower memory, slightly less precise,
  faster inserts.

pgvector is just a Postgres extension, so "vector database" here is the same
Postgres you're already using, with a `vector` column type and a `<=>`
operator.

### 1.4 The RAG pipeline

RAG is a five-stage pipeline. Every implementation, including ours, does some
version of these five things:

1. **Chunk** — break documents into smaller pieces (~paragraph-sized). You
   retrieve chunks, not whole documents, because (a) whole documents don't fit
   in the context window and (b) a specific fact lives in a specific paragraph.
2. **Embed** — run each chunk through the embedding model to get a vector.
3. **Store** — write the chunk text plus its vector to the vector database,
   tagged with ownership metadata.
4. **Retrieve** (at query time) — embed the user's query with the *same*
   model, then find the top-k closest stored chunks.
5. **Inject** — paste the retrieved chunks into the model's prompt as context.

The critical correctness rule, easy to violate by accident: **the query
embedding and the chunk embeddings must come from the same model**. Two
different embedding models produce vectors in two different spaces; cosine
similarity between them is meaningless. If you ever swap embedding models, you
must re-embed every existing chunk.

### 1.5 Retrieval thresholds

A similarity score is a number between -1 and 1. Top-k retrieval will *always*
return k results, even if none of them are actually relevant. To avoid
injecting garbage context, you filter by a **threshold** — drop any chunk whose
similarity is below some minimum.

Thresholds are model-specific: a score of 0.4 might mean "very relevant" on one
model and "barely related" on another. You tune the threshold empirically by
eyeballing retrieved chunks for real queries.

### 1.6 Reranking (and why we don't do it)

A more advanced pipeline adds a **reranker** as a sixth stage: a small
cross-encoder model that re-scores the top-k chunks with a more expensive but
more accurate method than pure vector similarity. Rerankers measurably improve
retrieval precision. They also add latency and a dependency. §4 covers our
deliberate omission.

### 1.7 The embedding-model trade-off

There is no free lunch in embedding models:

| | Large (e.g. OpenAI 1536-dim) | Small (e.g. MiniLM 384-dim) |
|---|---|---|
| Recall / quality | Higher | Lower |
| Cost | Per-call API cost | Free |
| Latency | Network round-trip | Local, CPU |
| External dependency | Yes (API key, network) | None |
| Vector storage size | 4× larger | Smaller |

For a small-to-medium corpus where cost and dependency avoidance matter, a
local small model is a reasonable choice — provided you accept somewhat lower
recall and tune the threshold accordingly. That is exactly the trade-off this
codebase has made.

---

## 2. How we do it here

### 2.1 The local embedding model

Embeddings are produced entirely on the server, no API calls, using
Transformers.js:

```ts
// src/lib/embeddings.ts:9-26
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false  // forces remote download (cached after first run)

let embedderPromise: Promise<any> | null = null

const getEmbedder = async () => {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      { device: 'cpu' },
    )
  }
  return embedderPromise
}
```

Three things to notice:

- **`@huggingface/transformers`** is the *new* package name (not the legacy
  `@xenova/transformers`). It runs the same models as HuggingFace's Python
  library, in Node, on CPU.
- **`Xenova/all-MiniLM-L6-v2`** is the model: a 384-dimensional sentence
  embedding model, ~25 MB, downloaded once and cached. Small, fast, free.
- **The singleton** (`embedderPromise`) is critical: the model load is the
  expensive part (~hundreds of ms + the 25 MB download). The singleton ensures
  it happens once per process, not once per request.

### 2.2 Mean pooling and normalization

The raw model output is one vector per *token*; we need one vector per
*sentence*. That reduction is **pooling**, and MiniLM uses mean pooling
(average the token vectors). The `embed` function also L2-normalizes the
result, which makes cosine similarity work as a simple dot product:

```ts
// src/lib/embeddings.ts:32-38
export const embed = async (text: string): Promise<number[]> => {
  const embedder = await getEmbedder()
  // pooling: 'mean' averages all token vectors into one sentence vector
  // normalize: true ensures cosine similarity works well
  const output = await embedder(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data as Float32Array)
}
```

Batch embedding (`embedBatch`, `src/lib/embeddings.ts:43-55`) does the same
thing for an array of texts in one pipeline call — important at ingest time,
where you may be embedding hundreds of chunks. The output is a flat
`Float32Array` sliced into 384-dim rows.

### 2.3 Storage — pgvector

Chunks live in `document_chunks` with a 384-dim vector column:

```sql
-- supabase/migrations/0004_rag_vector_dim.sql:12-16
alter table public.document_chunks add column embedding vector(384);

create index if not exists chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);
```

Two things this migration hides. First, **HNSW index with `vector_cosine_ops`**
— this is the index from §1.3 that makes nearest-neighbor search sub-linear.
Second, **the dimension is 384, matching MiniLM.** This was not always the case;
the original schema (`supabase/migrations/0001_initial_schema.sql:335`) used
`vector(1536)` — OpenAI's dimensionality. Migration `0004` dropped and
recreated the column at 384 when the codebase switched to local embeddings.
**The vector column dimension and the embedding model dimension must always
agree**; changing one without the other corrupts retrieval silently.

### 2.4 The retrieval RPC

Retrieval is a Postgres function so the distance computation happens in the
database, not in Node:

```sql
-- supabase/migrations/0004_rag_vector_dim.sql:20-50 (abridged)
create or replace function public.match_documents(
  query_embedding vector(384),
  match_count int default 5,
  filter_owner_id uuid default null,
  filter_agent_id uuid default null
)
returns table (id uuid, document_id uuid, content text, similarity float)
language sql stable as $$
  select
    dc.id, dc.document_id, dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where (filter_owner_id is null or dc.owner_id = filter_owner_id)
    and (filter_agent_id is null or exists (
      select 1 from public.documents d
      where d.id = dc.document_id
        and (d.agent_id = filter_agent_id or d.agent_id is null)
    ))
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
```

Two important things in the body:

- **`1 - (dc.embedding <=> query_embedding)`** is the cosine *similarity* from
  §1.2. The `<=>` operator returns distance; subtracting from 1 flips it to
  similarity so higher is better.
- **Ownership filtering happens in SQL**, with `filter_owner_id` and
  `filter_agent_id`. This is a second line of defense on top of the
  application layer (RLS handles the first). A bug in app-level scoping cannot
  leak chunks across owners because the RPC refuses to return them.

### 2.5 The ingest pipeline

The five stages from §1.4 are visible as a status walk in `uploadDocumentImpl`:

```ts
// src/server/documents.server.ts:157 (comment)
//   processing → extracting → chunking → embedding → storing → ready
```

The actual code, abridged:

```ts
// src/server/documents.server.ts:181, 231-245 (abridged)
export async function uploadDocumentImpl(...) {
  // ... extract text (pdf-parse, tesseract OCR, etc.)
  await updateDocStatus(supabase, doc.id, 'chunking')
  const chunks = chunkText(text)              // src/lib/chunking.ts:69

  await updateDocStatus(supabase, doc.id, 'embedding')
  // 4. Embed all chunks (batch for efficiency)
  for (let i = 0; i < chunks.length; i += 20) {
    const batch = chunks.slice(i, i + 20)
    const embeddings = await embedBatch(batch)
    // ... insert rows
  }
}
```

The chunker (`src/lib/chunking.ts`) is **tunable**, not fixed: `chunkText(text,
{ chunkSize, overlap = 50 })` — character-based chunking with a default 50-char
overlap between consecutive chunks (`src/lib/chunking.ts:124-131`). Batching at
20 chunks per `embedBatch` call balances throughput against per-call memory.

### 2.6 Retrieval at query time — `retrieveContext`

This is the function that powers chat-time RAG:

```ts
// src/server/documents.server.ts:303-333 (abridged)
export async function retrieveContext(
  query: string,
  agentId?: string,
  matchCount = 5,
) {
  const queryEmbedding = await embed(query)              // same model as chunks
  const { data, error } = await supabase.rpc('match_documents', {
    p_query_embedding: queryEmbedding,
    // ...owner + agent filters, match_count
  })
  // Only return chunks above a similarity threshold.
  // MiniLM (384-dim) produces lower similarity scores than larger models,
  // so we use a lower threshold (0.12). Even weak matches can contain the
  // ...answer the user is looking for.
  return (data ?? [])
    .filter((c) => c.similarity > 0.12)
    .sort((a, b) => b.similarity - a.similarity)
}
```

The threshold `0.12` is the loaded number. Read the comment: it acknowledges
that MiniLM's score distribution is lower than larger models, so the threshold
was set low to avoid over-filtering. §4 covers the trade-off.

### 2.7 The two retrieval call sites

`retrieveContext` is called in two places:

1. **Chat** — `src/server/chat.server.ts:270`, inside `sendMessageImpl`. The
   retrieved chunks are injected into the system prompt as a
   `## Knowledge Base Context` block, and the prompt instructs the model to
   check this context before saying "I don't know."
2. **Marketing** — `src/server/marketing.server.ts:112`, where brand-voice
   chunks are pulled before generating social posts for consistency.

In both cases, this is **manual prompt injection** — the chunks are pasted into
the prompt string. This is separate from Mastra's `Memory.semanticRecall`, which
is a different mechanism retrieving *past conversation turns*, not documents.
See doc 05.

---

## 3. The request flow

Two flows: ingest (rare, on upload) and retrieve (frequent, on chat).

**Ingest** — user uploads `policy.pdf`:

1. `documents.ts` RPC → `uploadDocumentImpl` (`documents.server.ts:181`).
2. Status → `extracting`: `extractText` (pdf-parse for text PDFs; tesseract.js
   OCR for scanned images; multimodal vision for images).
3. Status → `chunking`: `chunkText(text)` produces N chunks
   (`src/lib/chunking.ts:69`), each with a 50-char overlap with its neighbor.
4. Status → `embedding`: `embedBatch(batch)` in batches of 20
   (`documents.server.ts:245`), producing one 384-dim vector per chunk.
5. Status → `storing`: each chunk + its vector + `owner_id` + `document_id`
   inserted into `document_chunks`.
6. Status → `ready`. The document is now searchable.

**Retrieve** — later, the user asks "what's your refund policy?":

1. The chat message reaches `sendMessageImpl` (`chat.server.ts:193`).
2. After quota + persist, `retrieveContext(input.content, agent.id, 5)`
   (`chat.server.ts:270`) runs.
3. Inside `retrieveContext`: `embed(input.content)` produces the query vector
   with the *same* MiniLM model.
4. `match_documents` RPC (`documents.server.ts:318`) returns up to 5 chunks,
   filtered by owner_id and agent_id, computed in SQL.
5. Filter `similarity > 0.12`, sort descending (`documents.server.ts:332-333`).
6. Back in `sendMessageImpl`, surviving chunks are formatted into a
   `## Knowledge Base Context` block and prepended into the dynamic system
   prompt (`chat.server.ts:295`).
7. The agent generates with that enriched prompt. The model grounds its answer
   in the chunks; if none are relevant, the empty block doesn't mislead it.

---

## 4. Where we diverge from best practice

Four divergences.

> ⚠️ **Diverges from best practice: very low similarity threshold (`0.12`).**
>
> **Best practice:** tune the threshold empirically per model against a labeled
> set of relevant/irrelevant query-chunk pairs, then monitor retrieval quality
> in production.
>
> **What we do:** `retrieveContext` filters at `similarity > 0.12`
> (`documents.server.ts:332`). That is low — on a larger model a 0.12 match
> would be noise; on MiniLM the comment explains the score distribution is
> lower, so the bar was dropped to avoid filtering out real matches.
>
> **Why:** the codebase acknowledges the trade-off in a comment
> (`documents.server.ts:328-331`). MiniLM's absolute scores run lower than
> OpenAI-sized models; setting a "normal" threshold (0.3+) would have produced
> zero results on most queries.
>
> **Verdict: acceptable but under-tuned, and under-observed.** The threshold
> was set by feel, not measurement. Compounding this: there is no logging of
> retrieved chunks or their similarity scores in production (see doc 06's
> observability gap), so we can't tell whether the threshold is too low (noise
> in the prompt) or too high (real answers filtered out). First improvement:
> log every retrieved chunk's score for a week, then re-tune.

> ⚠️ **Diverges from best practice: small 384-dim model, no reranker.**
>
> **Best practice:** for production RAG, a larger embedding model (e.g.
> `bge-large`, `text-embedding-3-large`) for recall, plus a cross-encoder
> reranker (`bge-reranker-base`) for precision on the top-k.
>
> **What we do:** MiniLM only, no reranker.
>
> **Why:** cost (free), latency (local CPU), and zero external dependency — the
> `OPENAI_API_KEY` in `.env` has no balance, and AGENTS.md explicitly forbids
> OpenAI embedding calls. MiniLM is the deliberate response to that constraint.
>
> **Verdict: acceptable trade-off for CRM-scale corpora.** A few hundred to a
> few thousand chunks per tenant is well within MiniLM's useful range. If a
> tenant uploads 50,000 pages or if retrieval-quality complaints appear, this
> is the first knob to revisit — and `bge-large` runs locally too, so the swap
> doesn't violate the no-OpenAI-embeddings rule.

> ⚠️ **Diverges from best practice: the OpenAI-embedder trap.**
>
> **Best practice:** a framework's memory subsystem should not silently default
> to a paid external API for embeddings.
>
> **What we do:** Mastra's `Memory` *does* default to an OpenAI embedder for
> `semanticRecall`. We work around this two ways: (a) every CRM agent that
> uses `semanticRecall` explicitly injects a local adapter (`localEmbedder`,
> `src/mastra/agents/property-agent.ts:31`, defined at
> `src/mastra/local-embedder.ts`); (b) the studio agent omits `semanticRecall`
> entirely with an explicit comment about why
> (`src/mastra/agents/studio-agent.ts:35-37`). The adapter itself implements
> Mastra's `EmbeddingModelV2` interface (`specificationVersion: 'v2'`,
> `local-embedder.ts:25`) and routes `doEmbed` to `embedBatch`
> (`local-embedder.ts:35-39`).
>
> **Why:** AGENTS.md flags this as a "thing to never do" — enabling
> `semanticRecall` on a new agent without setting `embedder` would trigger an
> OpenAI API call that fails on quota and bills if it didn't. The workaround
> is the correct response to a framework-design wart.
>
> **Verdict: this is correctly worked around, but the trap remains.** Any new
> agent that copy-pastes the memory config and forgets the `embedder` line will
> trip it. The defense is convention + code review; there is no compile-time
> guard. Worth a lint rule or a wrapper that defaults `embedder` to local and
> requires an explicit opt-in to use anything else.

> ⚠️ **Diverges from best practice: chunking is tunable but tuning isn't surfaced.**
>
> **Best practice:** chunk size and overlap are first-class tuning knobs, set
> per document type (legal contracts chunk differently than chat logs), with
> measured impact on retrieval.
>
> **What we do:** chunking *is* parameterized
> (`src/lib/chunking.ts:69` — `chunkText(text, { chunkSize, overlap = 50 })`),
> but every caller uses the defaults. The defaults (character-based, 50-char
> overlap) are reasonable but unexamined.
>
> **Why:** YAGNI at current scale; one chunking strategy has been good enough.
>
> **Verdict: acceptable.** The tunability is there if you need it; surfacing
> it as a per-document setting is premature until there's evidence one size
> doesn't fit all.

---

## 5. Study prompts

Self-test questions.

1. **Same-model invariant.** Why must the query embedding use the same model as
   the chunk embeddings? Concretely: if you swapped MiniLM for a 768-dim model
   *only* at query time (not at ingest), what would `match_documents` do? What
   would `1 - (embedding <=> query)` return?
2. **The OpenAI trap.** Suppose you add a new agent, copy the memory config
   from `property-agent.ts`, and forget the `embedder: localEmbedder` line.
   What happens on the first user message that triggers recall? Trace the
   failure. Why does the studio agent avoid it by *omitting* recall rather than
   by setting the embedder?
3. **Threshold sensitivity.** With `similarity > 0.12`
   (`documents.server.ts:332`), a chunk scoring 0.13 is injected into the
   prompt. What's the risk to answer quality? Now set the threshold to 0.40 in
   your head — what's the risk *there*? Why is there no globally correct value?
4. **Why HNSW.** The index at `0004_rag_vector_dim.sql:15` is
   `using hnsw (embedding vector_cosine_ops)`. What does the `vector_cosine_ops`
   part specify, and what would change if you used `vector_l2_ops` instead?
   (Hint: which distance function does the `<=>` operator in the RPC body
   use?)
5. **Chunking trade-off.** `chunkText` defaults to a 50-character overlap
   (`chunking.ts:69`). Why overlap at all — what breaks if overlap is 0? Why
   not overlap by 50% — what breaks then?

**Experiments to run on this codebase:**

- Upload a multi-page PDF you know well. Add a `console.log` in
  `retrieveContext` printing each retrieved chunk's `similarity` score for a
  range of queries. You will see MiniLM's score distribution firsthand and can
  decide whether `0.12` is right for your content.
- Write a one-off script that calls `retrieveContext` with the *query* embedded
  by a different model (e.g. a 768-dim one) while the stored chunks stay at
  384. Observe the garbage similarities — this is the same-model invariant made
  visceral.
- Temporarily raise the threshold to 0.30 and ask the agent questions that
  should be answerable from your documents. Watch retrieval return zero chunks
  for queries that should match. This shows why "low threshold for a small
   model" is a real trade-off, not laziness.
- Find `local-embedder.ts` and confirm that adding `embedder: localEmbedder` to
  any new agent's `Memory` is sufficient to make `semanticRecall` safe. Then
  check: is there a lint rule or type-level guard that enforces this? (There
  isn't. That's the trap.)

**External concepts to read up on** (search these names): cosine similarity vs
L2 distance vs dot product for normalized vectors; **HNSW** (the original
paper, "Efficient and robust approximate nearest neighbor search using
Hierarchical Navigable Small World graphs"); **IVF** and product quantization;
**cross-encoder rerankers** (the `bge-reranker` family is a good reference);
the **MTEB** (Massive Text Embedding Benchmark) leaderboard, which ranks
embedding models by task; **chunking strategies** — fixed-size, sentence,
semantic, and the "small-to-big" retrieval pattern.
