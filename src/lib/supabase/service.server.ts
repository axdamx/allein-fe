import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    `[supabase/service] Missing env vars. SUPABASE_URL=${SUPABASE_URL ?? 'undefined'} ` +
      `SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY ? 'set' : 'undefined'}.`,
  )
}

let client: ReturnType<typeof createServerClient> | null = null

/**
 * Supabase admin client using the service_role key.
 * Bypasses RLS — only use in trusted server contexts (webhooks, cron, admin).
 */
export function getSupabaseServiceClient() {
  if (!client) {
    client = createServerClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // no-op — service client doesn't manage cookies
        },
      },
    })
  }
  return client
}
