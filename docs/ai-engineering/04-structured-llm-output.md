# 04 — Structured LLM Output

Agents (doc 01) and tools (doc 02) deal with the model *choosing* actions. This
doc deals with a different problem: getting the model to return **data**, not
prose. When you ask a model for "a social media post about a sale," you get a
string. When your app needs `{title, caption, hashtags}` to write three database
rows, you need **structured output** — and that turns out to be one of the
fiddliest problems in applied LLM work.

> **Vocabulary-first.** Terms are defined the first time they appear, in
> **bold**.

---

## 1. The concept

### 1.1 The problem

An LLM is a text generator. Left to itself, it will happily return:

```
Sure! Here's a JSON object for your post:

```json
{
  "title": "Summer Sale",
  "caption": "Beat the heat with 30% off everything this July!",
  "hashtags": ["#SummerSale", "#JulyDeal",]
}
```

Hope this helps!
```

This is a perfectly good string and a perfectly bad piece of JSON. There are
four independent problems in that one response:

1. **Prose around the JSON** ("Sure! Here's...", "Hope this helps!").
2. **Markdown code fences** (```` ```json ... ``` ````).
3. **A trailing comma** after the last hashtag — invalid JSON, fails
   `JSON.parse`.
4. **No guarantee the fields you want are present or correctly typed** — what
   if `hashtags` came back as a single string instead of an array?

Every one of these happens in production with small models. Structured-output
engineering is the discipline of making the model's output reliably
machine-parseable.

### 1.2 Strategy A — Constrained decoding (JSON Schema mode)

The most robust technique. At inference time, you give the provider a **JSON
Schema** and set `responseFormat: { type: "json_schema", schema }`. The
provider then constrains the model's token distribution so that *every sampled
token sequence is valid JSON conforming to the schema*. It is impossible for
the model to emit a trailing comma or a missing field, because those tokens
would not be selectable.

This is sometimes called **structured output mode**, **grammar-based
generation**, or **constrained decoding**. It is the gold standard when
available.

The catch: not every provider supports it, and some that claim to support it
do so unreliably. (See §2.1 for our specific case.) It can also slightly
degrade response quality on some tasks, because the model is fighting the
constraint.

### 1.3 Strategy B — Function/tool calling for structured output

A related approach, covered in doc 02: define a tool whose argument schema *is*
your desired output shape, and ask the model to call it. The model's tool call
is structured by construction. This works well when you're already in an agent
loop, less well for a one-shot "give me a JSON object" request.

### 1.4 Strategy C — Prompt + parse + repair

The fallback. You instruct the model explicitly ("respond with ONLY a JSON
object in this exact shape, no markdown, no commentary"), then **parse
defensively**: handle prose around the JSON, strip fences, fix common errors
before calling `JSON.parse`. This is the most portable strategy (works with
any model, any provider) and the most fragile. It is also the one this
codebase uses, so we'll spend the most time on it.

### 1.5 Repair vs reject vs retry

When parsing fails, you have three options:

- **Reject** — return a soft error ("the AI didn't return a valid response,
  please try again"). Simplest, worst UX, no wasted tokens.
- **Repair** — apply regex-level fixes (strip trailing commas, remove fences)
  and retry the parse. Cheap, catches the most common failures, no second
  model call.
- **Retry** — re-prompt the model with the error message and ask it to fix its
  output. Most reliable, costs a second inference, adds latency.

In practice, **repair + soft-reject** is the sweet spot for small models: fix
the two or three error classes that account for 90% of failures, and on
everything else bail gracefully. The next section's `extractJson` is a textbook
implementation of that approach.

### 1.6 When each strategy pays off

- **Schema mode** when the provider supports it well — it's free correctness.
- **Tool calling** when you're already in an agent loop and the output is a
  natural "decision" (which row to update, which category to pick).
- **Prompt + parse + repair** for small/local/quirky models, for one-shot
  generation outside agent loops, and when you need maximum portability across
  providers.

---

## 2. How we do it here

This codebase uses **Strategy C (prompt + parse + repair)**, with the repair
centralised in one utility. The reason it doesn't use Strategy A is provider
limitations.

### 2.1 Why not `generateObject` (Strategy A)

The Vercel AI SDK's `generateObject({ schema, ... })` is the canonical
Strategy A entry point. The codebase does not use it. The reason is documented
in two file headers:

```ts
// src/lib/ai-provider.ts:12-16
// Suppress AI SDK warnings about unsupported provider features.
// ZAI/GLM doesn't support responseFormat (json_schema), but generateObject
// still works via prompt-based JSON fallback. This global must be set on
// globalThis, not process.env — the AI SDK checks the global directly.
;(globalThis as Record<string, unknown>).AI_SDK_LOG_WARNINGS = false
```

```ts
// src/server/marketing.server.ts:6-9
 * Note: We use generateText + manual JSON parsing instead of generateObject
 * because GLM-4.5-flash doesn't support responseFormat (json_schema). The
 * schema-based approach fails silently — generateText with explicit JSON
 * output instructions and the extractJson hardening has proven more reliable.
```

Translation: the model (`glm-4.5-flash`, via ZAI / Zhipu) does not reliably
honor `responseFormat`. If you called `generateObject` it would either fail
loudly or, worse, succeed silently with malformed output. So the codebase
suppresses the SDK warning and uses `generateText` + a hardening layer instead.

This is the single most important architectural decision in this domain, and
it's worth internalising: **provider feature support is empirical, not
spec-based.** The provider's docs may claim JSON Schema support; whether it
actually works for your model and your prompt is something you discover by
testing.

### 2.2 The `extractJson` pipeline

The hardening layer lives in one file:

```ts
// src/lib/json-extract.ts:23-49
export function extractJson<T = unknown>(text: string): T | null {
  if (!text || typeof text !== 'string') return null

  // 1. Strip markdown code fences.
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')

  // 2. Find the first balanced {...} or [...] block.
  const block = findBalancedBlock(cleaned)
  if (!block) return null

  // 3. Try a direct parse first (fast path for well-formed output).
  try {
    return JSON.parse(block) as T
  } catch {
    // fall through to repair
  }

  // 4. Repair common issues and retry.
  const repaired = repairJson(block)
  try {
    return JSON.parse(repaired) as T
  } catch {
    return null
  }
}
```

Four stages, each solving one of the §1.1 problems:

1. **Strip fences** — handles the ```` ```json ```` wrapper.
2. **Find the balanced block** — handles prose around the JSON.
3. **Fast `JSON.parse`** — the common case; well-formed output parses cleanly.
4. **Repair and retry** — handles the trailing-comma class of errors.

Note the return type: `T | null`. It **never throws**. A failure to extract is
a `null`, and the caller is expected to treat that as a soft, recoverable
error. That's the §1.5 "repair + soft-reject" choice encoded in a function
signature.

### 2.3 The balanced-block walker

Stage 2 is the clever part. A naive approach would slice from the first `{` to
the last `}`. That breaks on JSON that contains braces inside string values
(`{"note": "use { and } carefully"}`). The real implementation tracks state:

```ts
// src/lib/json-extract.ts:56-97 (abridged)
function findBalancedBlock(text: string): string | null {
  const start = text.search(/[{[]/)
  if (start === -1) return null

  const stack: string[] = []
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{' || ch === '[') {
      stack.push(ch)
    } else if (ch === '}' || ch === ']') {
      const expected = ch === '}' ? '{' : '['
      if (stack[stack.length - 1] !== expected) {
        // Mismatched closer — bail, the JSON is beyond simple repair.
        return null
      }
      stack.pop()
      if (stack.length === 0) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null // unbalanced — ran out of characters
}
```

Three details worth seeing:

- **`inString` / `escape` tracking** means braces inside string literals don't
  affect the stack. `{"a": "{"}` correctly extracts the whole object.
- **Mismatched closer → `null`** (line 87 in source). If the model emits
  `{ "a": [1,2] }` — fine. If it emits `{ "a": ] }`, the parser bails rather
  than guess.
- **Stack-based**, so it handles arbitrary nesting of `{}` and `[]`.

### 2.4 The repairs

Stage 4 handles the two most common LLM JSON errors:

```ts
// src/lib/json-extract.ts:104-108
function repairJson(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, '$1') // trailing comma before close
    .replace(/,\s*,/g, ',') // duplicate commas
}
```

- **Trailing comma before close** — the #1 cause of `Unexpected token }` errors
  (the `["#a", "#b",]` example from §1.1). The regex removes any comma
  immediately preceding a `}` or `]`.
- **Duplicate commas** — `["a",,"b"]` → `["a","b"]`. Rarer, but cheap to fix.

These two fixes catch a large majority of real-world GLM parse failures. Note
what they *don't* fix: unescaped quotes inside strings, missing commas between
fields, or wrong types. Those fall through to the final `return null`.

### 2.5 The two call sites that use it correctly

**Marketing post generation** — `generatePostImpl`:

```ts
// src/server/marketing.server.ts:144-155 (abridged)
    const parsed = extractJson<{
      title?: string
      caption?: string
      hashtags?: string[]
    }>(result.text)

    // ... validation ...
```

Followed by field validation, `String()`/`Number()` coercion, length clamps,
and a soft-error return if anything is missing. This is the canonical
**extract → validate → coerce → soft-error** pattern, and it's worth copying.

**Storyboard generation** — `generateStoryboardFromBriefImpl`:

```ts
// src/server/storyboard.server.ts:331-340 (abridged)
    // GLM frequently emits trailing commas or prose around the JSON — use the
    // hardened extractor instead of a raw JSON.parse on a greedy regex.
    const parsed = extractJson<{
      title?: string
      scenes?: Array<{ caption?: string; prompt?: string; duration_ms?: number }>
    }>(result.text)

    if (!parsed || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      return {
        error:
          'AI did not return a valid storyboard plan. Please try again or rephrase the brief.',
      }
    }
```

Note the comment — it's the same trade-off articulation, written for the next
reader. Note also the scene count clamp earlier in the function
(`Math.min(Math.max(input.sceneCount ?? 4, 2), 8)`,
`storyboard.server.ts:303`) — the model is told "Exactly N scenes," but the
caller still validates and clamps. **Never trust the model's adherence to its
own instructions; always validate.**

### 2.6 The defensive pattern, distilled

Every well-formed call site in this codebase follows the same shape:

1. Build a prompt with the exact JSON shape stated, plus "Output ONLY the JSON."
2. `const result = await generateText({ model, prompt, ... })`.
3. `const parsed = extractJson<{...}>(result.text)`.
4. If `parsed` is null → return a soft error.
5. Validate each field (`Array.isArray`, presence checks), coerce with
   `String()`/`Number()`, clamp lengths/values.
6. If validation fails → return a soft error.
7. Persist the typed, validated result.

Steps 4 and 6 are the "reject" part of "repair + reject." Steps 5 and 6 are
the schema validation that Strategy A would have given you for free.

---

## 3. The request flow

One marketing post generation, end to end:

1. The user picks a topic and clicks "Generate" → `marketing.ts` RPC →
   `generatePostImpl` in `marketing.server.ts`.
2. **(Optional) RAG retrieve.** Up to 3 brand-voice chunks are pulled
   (`marketing.server.ts:112`) and spliced into the prompt for tone
   consistency. See doc 03.
3. **Build the prompt.** System instructions + brand context + an explicit
   JSON shape contract:
   ```
   Respond with ONLY a JSON object in this exact shape (no markdown, no commentary):
   { "title": "...", "caption": "...", "hashtags": ["..."] }
   ```
4. **`generateText({ model: getDefaultModel(), prompt })`** — the model emits
   text. Per §2.1, this is *not* `generateObject`; we expect prose/fences/
   trailing commas and handle them next.
5. **`extractJson<{title, caption, hashtags}>(result.text)`** — strip fences →
   find balanced block → fast parse → repair if needed → parse again. Returns
   the typed object or `null`.
6. If `null` → return `{error: 'Could not parse the response, please try
   again'}` to the UI. End.
7. **Validate**: `title` and `caption` are present and strings; `hashtags` is
   an array; clamp lengths.
8. **`consumeQuota('posts')`** (`marketing.server.ts:223`) — the write counts
   against the daily quota (note: the *generation* does not consume quota,
   only the *save*; this is deliberate, so a failed generation doesn't burn a
   credit).
9. Insert the post row.

---

## 4. Where we diverge from best practice

Four divergences.

> ⚠️ **Diverges from best practice: `planner.server.ts` uses a raw greedy regex
> instead of `extractJson`.**
>
> **Best practice:** (and our own rule, AGENTS.md "Things to never do": *Don't
> parse LLM JSON with a raw greedy regex + `JSON.parse` — use `extractJson()`*)
> every LLM JSON parse in the codebase should go through `extractJson`.
>
> **What we do:** `planner.server.ts` violates the rule:
> ```ts
> // src/server/planner.server.ts:229-234
> const jsonMatch = raw.match(/\[[\s\S]*\]/)
> if (!jsonMatch) {
>   // ... error handling
> }
> const tasks: { title: string; ... }[] = JSON.parse(jsonMatch[0])
> ```
> The regex `/\[[\s\S]*\]/` is **greedy** — `[\s\S]*` matches as much as
> possible, so if the response contains two JSON arrays, it matches from the
> first `[` to the last `]`, producing invalid JSON. There's no fence
> stripping, no comma repair, no string-state tracking.
>
> **Why:** this file predates `extractJson` and was never refactored.
>
> **Verdict: tech debt — and the single clearest fix in the whole codebase.**
> This is a one-line-ish swap: replace lines 229-234 with
> `extractJson<Task[]>(raw)` plus a null check, matching the pattern in
> `marketing.server.ts:144` and `storyboard.server.ts:331`. Until then, this
> file is one prompt-fence away from a `JSON.parse` crash that the rest of the
> codebase is hardened against.

> ⚠️ **Diverges from best practice: no schema-validation library on parsed
> output.**
>
> **Best practice:** after `extractJson`, validate the parsed object against a
> **Zod** schema (the codebase already depends on Zod for tool inputs — see
> doc 02 §2.1). A schema gives you centralized, typed validation instead of
> ad-hoc checks at each call site.
>
> **What we do:** ad-hoc validation per call site —
> `Array.isArray(parsed.scenes)`, `String(parsed.title ?? 'Untitled').slice(0,
> 100)`, etc. Each site re-implements presence, type, and length checks in
> slightly different ways.
>
> **Why:** the output shapes are small (2–4 fields each). At that size, ad-hoc
> is arguably clearer than a schema.
>
> **Verdict: acceptable at current size, scales poorly.** The day a sixth or
> seventh structured-output call site appears, factor the shared shapes into
> Zod schemas and validate through them. The infrastructure (Zod is already a
> dependency) is free; only convention is missing.

> ⚠️ **Diverges from best practice: `extractJson` handles only the first JSON
> block.**
>
> **Best practice:** if a response can contain multiple JSON objects, either
> parse them all, or document the single-block limitation prominently.
>
> **What we do:** `findBalancedBlock` (`json-extract.ts:56`) returns at the
> first matched `{...}` or `[...]`. If the model emits two objects, the second
> is silently lost.
>
> **Why:** current call sites expect a single object, so the limitation hasn't
> mattered.
>
> **Verdict: acceptable.** Worth a one-line addition to the file's header
> comment so the next reader doesn't get bitten when they write a multi-object
> prompt.

> ⚠️ **Diverges from best practice: repair scope doesn't match the file's
> claims.**
>
> **Best practice:** a repair function should fix what its own documentation
> claims it fixes, or the docs should be tightened to match.
>
> **What we do:** the `json-extract.ts` header comment (lines 4-11) lists
> "unescaped quotes inside string values" as one of the problems the utility
> handles. But `repairJson` (`json-extract.ts:104-108`) only fixes trailing
> and duplicate commas. Unescaped quotes are not actually repaired — they're
> only *detected* indirectly, via the `inString`/`escape` tracking in
> `findBalancedBlock` (which prevents a quote-mid-string from confusing the
> brace stack). A genuinely unescaped quote in the model's output still
> produces a `JSON.parse` failure.
>
> **Why:** the comment is aspirational; the code handles the common cases.
>
> **Verdict: minor, but worth fixing for honesty.** Either drop "unescaped
> quotes" from the header comment to match the code, or add a real
> quote-escaping repair. The former is the right call at current scale; full
> quote repair is a rabbit hole.

---

## 5. Study prompts

Self-test questions.

1. **Why `generateObject` was avoided.** Read `src/lib/ai-provider.ts:12-16`
   and `src/server/marketing.server.ts:6-9`. In your own words: what does it
   mean for a provider to "not support `responseFormat`"? What would happen
   concretely if you swapped `generateText` for `generateObject` in
   `generatePostImpl` today?
2. **Greedy regex failure mode.** Given `planner.server.ts:229`'s
   `/\[[\s\S]*\]/`, what does the regex match on this model output?
   ```
   Here are your tasks: [{"title":"A"}]. Notes: [{"extra":"data"}]
   ```
   What does `JSON.parse` do with that match? Why does `extractJson` not have
   this problem?
3. **When repair isn't enough.** Write a model output that `extractJson`
   returns `null` for. (Hint: which classes of malformed JSON does it not
   fix?) Trace the path through the four stages to confirm where it bails.
4. **Strategy choice.** For each of these, would you pick schema mode, tool
   calling, or prompt+parse+repair? (a) asking a frontier model for a 20-field
   structured report; (b) asking `glm-4.5-flash` for a 3-field social post;
   (c) asking an agent inside a tool loop to choose a category from a fixed
   list. Justify each.
5. **Validation discipline.** `storyboard.server.ts` clamps scene count to
   `2..8` (`:303`) *and* tells the model "Exactly N scenes" in the prompt
   *and* checks `Array.isArray(parsed.scenes)` after parsing. Why all three?
   Which one would you trust if you could keep only one?

**Experiments to run on this codebase:**

- **The planner refactor.** Replace `planner.server.ts:229-234` with an
  `extractJson` call. Run the planner on a few real inputs. Compare the
  failure rate before and after. (This is the single highest-leverage cleanup
  in the structured-output layer.)
- **Add a Zod schema** to `generatePostImpl`. After `extractJson`, parse with
  `z.object({ title: z.string(), caption: z.string(), hashtags:
  z.array(z.string()) }).safeParse(parsed)`. Confirm the behavior is identical
  for valid input, and notice how much cleaner the validation reads.
- **Stress-test `extractJson`.** Write a small script that feeds it 20
  pathological model outputs (prose-wrapped, fenced, trailing commas, nested
  braces in strings, mismatched closers, two objects). Count how many parse
  successfully. The failures are the cases where you'd need Strategy A or a
  retry.
- **Repair-scope honesty.** Edit the `json-extract.ts` header comment to
  accurately reflect what `repairJson` does and doesn't fix (or, alternatively,
  extend `repairJson` to actually fix one more class of error). Either is a
  legitimate first PR to this file.

**External concepts to read up on** (search these names): **JSON Schema** (the
specification itself — `json-schema.org`); **constrained decoding** and
**grammar-based generation** — `outlines` and `llama.cpp`'s GBNF grammars are
the canonical references; **function calling vs tool calling** (naming varies
by provider, same idea); OpenAI's `response_format: { type: "json_schema" }`
docs and Anthropic's tool-use docs for comparison; the **"JSON mode" vs "JSON
Schema mode"** distinction (JSON mode guarantees valid JSON; Schema mode
guarantees valid JSON *conforming to a schema* — they are not the same thing).
