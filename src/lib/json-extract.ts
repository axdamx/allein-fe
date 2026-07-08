/**
 * Robust JSON extraction + repair for LLM output.
 *
 * GLM-4.5-flash (and most small LLMs) frequently return malformed JSON:
 *  - markdown fences (```json ... ```)
 *  - prose before/after the JSON object
 *  - trailing commas (the #1 cause of "Unexpected token }" / position errors)
 *  - unescaped quotes inside string values
 *
 * This utility finds the first balanced {...} or [...] block (ignoring braces
 * inside strings), strips trailing commas, and parses. Returns null if no
 * valid JSON can be recovered — callers should treat that as a soft failure.
 *
 * Used instead of `generateObject` because GLM-4.5-flash doesn't reliably
 * honor `responseFormat: json_schema`, and the manual-parse approach (with
 * this hardening) has proven more reliable in practice.
 */

/**
 * Extract and parse the first JSON object/array from an LLM response.
 * Returns null if no valid JSON can be recovered (does not throw).
 */
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

/**
 * Walk the string tracking a bracket stack + string state, returning the
 * substring from the first opener to its matching closer. Correctly skips
 * braces that appear inside JSON string values (handles escaped quotes).
 */
function findBalancedBlock(text: string): string | null {
  const start = text.search(/[{[]/)
  if (start === -1) return null

  const stack: string[] = []
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
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

/**
 * Apply the most common JSON repairs that LLMs need:
 *  - trailing commas before `}` or `]`  (e.g. `[1,2,]` → `[1,2]`)
 *  - duplicate commas                    (e.g. `[1,,2]` → `[1,2]`)
 */
function repairJson(text: string): string {
  return text
    .replace(/,\s*([}\]])/g, '$1') // trailing comma before close
    .replace(/,\s*,/g, ',') // duplicate commas
}
