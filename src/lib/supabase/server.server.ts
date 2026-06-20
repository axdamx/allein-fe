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
      setAll(cookies: { name: string; value: string }[]) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value)
        })
      },
    },
    realtime: {
      transport: ws as unknown as typeof WebSocket,
    },
  })
}
