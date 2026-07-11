/**
 * TanStack Start entry point.
 *
 * Registers global request middleware:
 *   1. CSRF protection — rejects cross-origin POST/PUT/DELETE server-fn calls
 *      by validating Sec-Fetch-Site / Origin / Referer.
 *   2. Security response headers — CSP, HSTS, X-Frame-Options, etc.
 *
 * This file is auto-detected by the `tanstackStart()` vite plugin and replaces
 * the no-op default entry, so its middleware applies to every request.
 */
import { createStart, createMiddleware, createCsrfMiddleware } from '@tanstack/react-start'

// ---------------------------------------------------------------------------
// Security headers — applied to every response.
// ---------------------------------------------------------------------------
//
// CSP allows inline styles (Tailwind injects runtime styles for theming/resize
// observers) and blob:/data: images (generated media URLs), but blocks inline
// scripts and unknown external origins. Tighten further by editing below.
//
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_HOST = (() => {
  try {
    return SUPABASE_URL ? new URL(SUPABASE_URL).host : ''
  } catch {
    return ''
  }
})()

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // TanStack Start injects window.$_TSR bootstrap data as an inline script,
  // and Vite injects per-request module-preload/reload scripts inlined in dev.
  // Without 'unsafe-inline' for scripts, hydration fails (no nonce API today).
  "script-src 'self' 'unsafe-inline'",
  // Tailwind/theming need inline styles.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data:",
  "img-src 'self' data: blob:" + (SUPABASE_HOST ? ` https://${SUPABASE_HOST}` : ''),
  "media-src 'self' blob:" + (SUPABASE_HOST ? ` https://${SUPABASE_HOST}` : ''),
  "connect-src 'self' https://" + (SUPABASE_HOST || '*.supabase.co') +
    (process.env.NODE_ENV === 'development' ? ' ws: http:' : ''),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP_DIRECTIVES,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // HSTS only honored over HTTPS; safe to emit everywhere.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
}

/**
 * HTTP methods that never mutate state. CSRF protection is skipped for these
 * so direct-URL navigations (which may omit Sec-Fetch-Site/Origin/Referer)
 * are not rejected.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Request middleware that stamps security headers onto every response.
 * Runs AFTER the framework produces the downstream response.
 */
const securityHeadersMiddleware = createMiddleware().server(async (ctx) => {
  const result = await ctx.next()
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    result.response.headers.set(k, v)
  }
  return result
})

// ---------------------------------------------------------------------------
// Build the Start instance with CSRF + security-headers middleware.
// ---------------------------------------------------------------------------

export const startInstance = createStart(() => ({
  requestMiddleware: [
    // CSRF: only validate STATE-CHANGING requests (POST/PUT/DELETE/PATCH).
    // GET navigations (page loads, link clicks) are exempt — browsers don't
    // always send Sec-Fetch-Site/Origin/Referer on top-level navigations,
    // and GETs are not CSRF-relevant (they shouldn't mutate state anyway).
    createCsrfMiddleware({
      filter: (ctx) => !SAFE_METHODS.has(ctx.request.method.toUpperCase()),
      secFetchSite: ['same-origin', 'same-site', 'none'],
      referer: true,
      // For validated (unsafe) requests that carry NONE of the three signals,
      // treat as CSRF and reject. Legitimate browser POSTs always send at
      // least one of Sec-Fetch-Site / Origin / Referer.
      allowRequestsWithoutOriginCheck: false,
    }),
    securityHeadersMiddleware,
  ],
}))
