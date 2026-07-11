/**
 * Shared auth + ownership helpers for server implementations.
 *
 * These enforce defense-in-depth on top of Supabase Row-Level Security:
 * every getById / update / delete path resolves the caller's user id and
 * scopes the operation by `owner_id`, so even if a table's RLS policy is
 * missing or misconfigured the operation cannot touch another tenant's rows.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

/**
 * Resolve the authenticated user's id from the request-scoped Supabase client.
 * Throws (caller turns into a 500 / generic error) if no session is present.
 */
export async function requireUserId(): Promise<string> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

/**
 * Soft variant: returns null instead of throwing. Useful for read/list paths
 * that prefer to return an empty result rather than error out.
 */
export async function getUserIdOrNull(): Promise<string | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Assert that a row in `table` with the given `id` belongs to `userId`.
 * Returns true if owned, false otherwise. Use to gate update/delete ops:
 *
 *   if (!(await assertOwnership('studio_assets', assetId, userId))) {
 *     return { error: 'Asset not found' }
 *   }
 *
 * The lookup is a single primary-key select scoped by owner_id, so it both
 * confirms existence and ownership in one round-trip.
 */
export async function assertOwnership(
  table: string,
  id: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('owner_id', userId)
    .maybeSingle()
  return !!data
}
