import { getCookies, setCookie } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'
import ws from 'ws'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly at module load so misconfigured env vars are impossible
  // to miss. (Previously this silently created a client pointing at
  // `undefined`, which made signUp/signIn return no error but do nothing.)
  throw new Error(
    `[supabase] Missing env vars. SUPABASE_URL=${SUPABASE_URL ?? 'undefined'} ` +
      `SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY ? 'set' : 'undefined'}. ` +
      `Check your .env file and that vite.config.ts loads it.`,
  )
}

// After the guard above, these are guaranteed defined.
const RESOLVED_URL: string = SUPABASE_URL
const RESOLVED_KEY: string = SUPABASE_ANON_KEY

/**
 * Whether cookies should carry the `Secure` attribute. In production over
 * HTTPS this is always on; in local dev (http://localhost) it would block
 * the session cookie, so we relax it there.
 */
const COOKIE_SECURE = process.env.NODE_ENV === 'production'

/**
 * Supabase client scoped to a single server request.
 *
 * Reads + writes the auth session via TanStack Start's cookie APIs so
 * that `supabase.auth.getUser()` / `signInWithPassword()` etc. persist
 * the session across the SSR boundary.
 *
 * We inject a `ws` transport into the realtime sub-client because the
 * dev runtime may be Node 20 (no native WebSocket). Server-side auth
 * flows never use realtime, but supabase-js eagerly constructs the
 * realtime client, which warns without a transport.
 *
 * SECURITY: `setAll` honors Supabase's cookie options AND hard-enforces
 * `SameSite=Lax` (CSRF mitigation — prevents cross-site cookie submission
 * of POST requests) plus `Secure` in production. Supabase's defaults pass
 * these through but we force them so a future library change can't relax
 * the policy.
 */
export function getSupabaseServerClient() {
  return createServerClient(RESOLVED_URL, RESOLVED_KEY, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value,
        }))
      },
      setAll(
        cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
      ) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value, {
            ...(cookie.options ?? {}),
            sameSite: 'lax',
            secure: COOKIE_SECURE,
            httpOnly: true,
          })
        })
      },
    },
    realtime: {
      transport: ws as unknown as typeof WebSocket,
    },
  })
}
