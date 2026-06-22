/** Server-only implementation for settings (profile + plan updates). */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import type { PlanTier } from '@/lib/plans'
import type { AgentTypeKey } from '@/lib/agent-types'

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  phone: string | null
  plan: PlanTier
  role: 'member' | 'admin' | 'owner'
  agent_type: AgentTypeKey | null
  telegram_chat_id: string | null
}

/** Fetch the current user's profile. */
export async function getProfileImpl(): Promise<ProfileRow | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, company, phone, plan, role, agent_type, telegram_chat_id')
    .eq('id', user.id)
    .single()

  if (error || !data) return null
  return data as ProfileRow
}

/** Update profile fields. */
export async function updateProfileImpl(input: {
  fullName?: string
  company?: string
  phone?: string
  avatarUrl?: string
  telegramChatId?: string | null
}): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updates: Record<string, string | null> = {}
  if (input.fullName !== undefined) updates.full_name = input.fullName
  if (input.company !== undefined) updates.company = input.company
  if (input.phone !== undefined) updates.phone = input.phone
  if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl
  if (input.telegramChatId !== undefined) updates.telegram_chat_id = input.telegramChatId

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  return null
}

/** Change the user's plan (demo only — real billing ships in Phase 7). */
export async function updatePlanImpl(
  plan: PlanTier,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return null
}

/** Set the user's agent type during onboarding. */
export async function updateUserAgentTypeImpl(
  agentType: AgentTypeKey,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ agent_type: agentType })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return null
}
