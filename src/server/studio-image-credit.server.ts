/** Server-only image credit reservations shared by the Studio form and agent. */
import { getSupabaseServiceClient } from '@/lib/supabase/service.server'
import { PLAN_CONFIGS, type PlanTier } from '@/lib/plans'
import { windowKeyForWindow, type ConsumeResult } from '@/server/profile.server'

export async function reserveStudioImageCredit(input: {
  ownerId: string
  assetId: string
  plan: PlanTier
  role: string
}): Promise<ConsumeResult> {
  const windowKey = windowKeyForWindow('month')
  if (!windowKey) throw new Error('Could not determine image quota month')

  const { data, error } = await getSupabaseServiceClient().rpc('reserve_studio_image_credit', {
    p_owner_id: input.ownerId,
    p_asset_id: input.assetId,
    p_max: PLAN_CONFIGS[input.plan]?.limits.imageGen.max ?? 0,
    p_window_key: windowKey,
    p_bypass: input.role === 'admin' || input.role === 'owner',
  })
  if (error || !data?.length) {
    throw new Error(`Could not reserve image credit: ${error?.message ?? 'no result'}`)
  }

  const row = data[0]
  return {
    allowed: row.allowed,
    used: row.used,
    remaining: row.remaining,
    max: row.max_out,
    resetAt: row.reset_at,
  }
}

/** Returns false when already refunded or when a usable asset exists. */
export async function refundStudioImageCredit(assetId: string): Promise<boolean> {
  const { data, error } = await getSupabaseServiceClient()
    .rpc('refund_studio_image_credit', { p_asset_id: assetId })
  if (error) throw new Error(`Could not refund image credit: ${error.message}`)
  return data === true
}
