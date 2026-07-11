/**
 * Error-sanitization helpers.
 *
 * Raw Postgres / Supabase / provider error messages frequently leak schema
 * details, constraint names, or internal diagnostics. Returning them to the
 * client is an information disclosure. These helpers log the raw detail
 * server-side and return a generic, user-facing string.
 *
 * The principle: clients get a message safe to display; operators get the
 * real detail in logs.
 */

/**
 * A known set of user-meaningful messages that are SAFE to return as-is.
 * These are intentional application-level strings, not provider internals.
 * Membership is checked by substring so variants like
 * "Not authenticated" / "Asset not found" pass through.
 */
const SAFE_SUBSTRINGS = [
  'Not authenticated',
  'not found',
  'not available on your plan',
  'not yet linked',
  "don't have any active agents",
  'No phone number',
  'Telegram not connected',
  'daily_message_limit_reached',
  'Rate limit',
]

function isUserFacingMessage(msg: string): boolean {
  const lower = msg.toLowerCase()
  return SAFE_SUBSTRINGS.some((s) => lower.includes(s.toLowerCase()))
}

/**
 * Map an unknown error to a string safe to return to the client.
 * The raw message is logged to stderr for debugging.
 *
 * @param err       The thrown/rejected error.
 * @param fallback  Generic message to return when the raw one isn't allow-listed.
 */
export function safeError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err)
  // console.warn so it surfaces in server logs without being mistaken for a
  // thrown exception trace.
  console.warn('[safeError] raw error:', raw)
  if (isUserFacingMessage(raw)) return raw
  return fallback
}

/**
 * Variant for the common Supabase `{ error: error.message }` pattern.
 * Returns `{ error: safeMessage }`.
 */
export function safeErrorObject(
  err: unknown,
  fallback: string,
): { error: string } {
  return { error: safeError(err, fallback) }
}

/**
 * Convenience: take a raw Supabase error message string (already extracted)
 * and either pass it through (if allow-listed) or replace with `fallback`.
 * Useful when the call site already destructured `error.message`.
 */
export function sanitizeSupabaseMessage(
  rawMessage: string | undefined,
  fallback: string,
): string {
  if (!rawMessage) return fallback
  if (isUserFacingMessage(rawMessage)) return rawMessage
  // Still log so operators can trace.
  console.warn('[safeError] raw supabase message:', rawMessage)
  return fallback
}

/**
 * Escape a user-supplied search term before embedding it in a PostgREST
 * `.or()` / `.ilike()` filter expression.
 *
 * PostgREST filters use `,` (filter separator), `.` (operator separator),
 * and `()` (grouping). An unsanitized value can break out of the intended
 * column, e.g. a search of "x,email.eq.victim@x.com" would add an extra
 * exact-match clause. We:
 *   - strip the PostgREST metacharacters `,` `.` `(` `)` `*` `\\`
 *   - escape SQL LIKE wildcards `%` and `_` (PostgREST passes them through)
 *
 * This is defense-in-depth on top of RLS — it prevents a caller from
 * widening a search into an unintended column or operator.
 */
export function sanitizePostgrestFilter(value: string): string {
  // Remove PostgREST filter-syntax metacharacters entirely. They are not
  // meaningful inside a search term, so dropping them is safe.
  const stripped = value.replace(/[,.()\\]/g, '')
  // Escape SQL LIKE wildcards so they match literally.
  return stripped.replace(/[_%]/g, (m) => `\\${m}`)
}
