/**
 * Lightweight in-memory rate limiter.
 *
 * Uses a fixed-window counter per key (IP or user id). Sufficient for
 * single-instance and serverless warm-start deployments. For multi-instance
 * production, swap the `Map` for Redis/Upstash without changing the call sites.
 *
 * NOT a hard security boundary — the goal is to stop brute-force / spam, not
 * a determined DDoS (which must be handled at the edge / CDN).
 */

interface Bucket {
  /** Epoch ms when the current window resets. */
  resetAt: number
  /** Hits in the current window. */
  count: number
}

const buckets = new Map<string, Bucket>()

// Opportunistic GC so the map can't grow unbounded under load.
const GC_INTERVAL_MS = 5 * 60 * 1000
let lastGc = Date.now()

function gc(now: number) {
  if (now - lastGc < GC_INTERVAL_MS) return
  lastGc = now
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

export interface RateLimitConfig {
  /** Window size in ms. */
  windowMs: number
  /** Max hits per window. */
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Hits in the current window (after this attempt if allowed). */
  count: number
  /** Max allowed per window. */
  max: number
  /** Epoch ms when the window resets and count resets to 0. */
  resetAt: number
}

/**
 * Attempt to consume one hit from the bucket identified by `key`. Returns
 * `allowed: false` if the limit is exceeded (the hit is NOT counted in that
 * case, so rejected requests don't inflate the count).
 */
export function rateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  gc(now)

  const resetAt = now + cfg.windowMs
  let bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    bucket = { resetAt, count: 0 }
    buckets.set(key, bucket)
  }

  if (bucket.count >= cfg.max) {
    return { allowed: false, count: bucket.count, max: cfg.max, resetAt: bucket.resetAt }
  }

  bucket.count += 1
  return { allowed: true, count: bucket.count, max: cfg.max, resetAt: bucket.resetAt }
}

/**
 * Extract a best-effort client IP from a Request, honoring the standard
 * proxy headers. Falls back to 'unknown' when no IP can be determined
 * (all such requests share a single bucket).
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    // XFF can be a list; the first entry is the original client.
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xRealIp = request.headers.get('x-real-ip')
  if (xRealIp) return xRealIp.trim()
  return 'unknown'
}
