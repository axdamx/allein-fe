/**
 * SSRF guard for outbound requests driven by user/LLM-supplied URLs.
 *
 * Prompt injection can coerce an agent into passing an internal URL (e.g. the
 * cloud metadata service http://169.254.169.254/...) to a fetcher. This helper
 * validates scheme + host BEFORE any request is made.
 *
 * Hostname resolution checks are deferred to the runtime — here we block by
 * string pattern: link-local, loopback, private, and non-https schemes. For
 * full coverage, the runtime making the request should also resolve and recheck,
 * but this catches the obvious intranet/metadata targets.
 */

const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./, // loopback v4
  /^0\./,
  /^10\./, // private
  /^192\.168\./, // private
  /^172\.(1[6-9]|2\d|3[01])\./, // private
  /^169\.254\./, // link-local (incl. metadata service)
  /^::1$/, // loopback v6
  /^fc/, // unique local v6
  /^fd/, // unique local v6
  /^fe80:/, // link-local v6
  /\.local$/i, // mDNS
  /\.internal$/i,
]

export interface UrlGuardOptions {
  /**
   * If true (default), allow http: in addition to https:. Off by default —
   * most callers should require https. Enable for dev/localhost scenarios.
   */
  allowHttp?: boolean
}

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'UnsafeUrlError'
  }
}

/**
 * Assert that `url` is safe to fetch. Throws UnsafeUrlError otherwise.
 * Returns the validated URL object for convenience.
 */
export function assertSafeUrl(url: string, opts: UrlGuardOptions = {}): URL {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new UnsafeUrlError('Invalid URL')
  }

  if (opts.allowHttp) {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new UnsafeUrlError(`Unsupported protocol: ${parsed.protocol}`)
    }
  } else {
    if (parsed.protocol !== 'https:') {
      throw new UnsafeUrlError('Only https: URLs are allowed')
    }
  }

  const host = parsed.hostname
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(host)) {
      throw new UnsafeUrlError('URL points to a blocked host')
    }
  }

  // Block userinfo (http://user:pass@host) — a common SSRF / log-injection trick.
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError('URL with credentials is not allowed')
  }

  return parsed
}
