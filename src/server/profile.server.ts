/**
 * Server-only implementation for profile / plan operations.
 *
 * This file is .server.ts so TanStack Start never bundles it into client
 * code. The public server functions in profile.ts re-export thin wrappers
 * that the client calls via RPC.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { PLAN_CONFIGS, minTierForFeature, minTierForLimit } from '@/lib/plans'
import type { PlanTier, LimitMetric } from '@/lib/plans'
import type { PlanState } from '@/server/profile'

/** Fetch the logged-in user's id + profile row. Returns null if unauthed. */
export async function getCurrentUserProfile() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, email, plan, role, agents_count, conversations_count, messages_count, posts_count, documents_count, whatsapp_messages_count, telegram_messages_count, agent_type',
    )
    .eq('id', user.id)
    .single()

  if (error || !profile) return null

  return profile
}

/** Count the user's leads for plan tracking (no DB column needed). */
async function countUserLeads(userId: string): Promise<number> {
  const supabase = getSupabaseServerClient()
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
  return count ?? 0
}

function computeRemaining(used: number, max: number | null): number | null {
  if (max === null) return null
  return Math.max(0, max - used)
}

/** Build the PlanState object from a profile row and optional lead count. */
export function buildPlanState(
  profile: {
    plan: string
    id?: string
    agents_count: number
    conversations_count: number
    messages_count: number
    posts_count: number
    documents_count: number
    whatsapp_messages_count?: number
    telegram_messages_count?: number
  },
  leadsCount: number = 0,
): PlanState {
  const config = PLAN_CONFIGS[profile.plan as PlanTier] ?? PLAN_CONFIGS.free

  const usage: Record<LimitMetric, number> = {
    agents: profile.agents_count ?? 0,
    conversations: profile.conversations_count ?? 0,
    messages: profile.messages_count ?? 0,
    posts: profile.posts_count ?? 0,
    documents: profile.documents_count ?? 0,
    leads: leadsCount,
    whatsappMessages: profile.whatsapp_messages_count ?? 0,
    telegramMessages: profile.telegram_messages_count ?? 0,
  }

  const remaining: Record<LimitMetric, number | null> = {
    agents: computeRemaining(usage.agents, config.limits.agents.max),
    conversations: computeRemaining(
      usage.conversations,
      config.limits.conversations.max,
    ),
    messages: computeRemaining(usage.messages, config.limits.messages.max),
    posts: computeRemaining(usage.posts, config.limits.posts.max),
    documents: computeRemaining(usage.documents, config.limits.documents.max),
    leads: computeRemaining(usage.leads, config.limits.leads.max),
    whatsappMessages: computeRemaining(
      usage.whatsappMessages,
      config.limits.whatsappMessages.max,
    ),
    telegramMessages: computeRemaining(
      usage.telegramMessages,
      config.limits.telegramMessages.max,
    ),
  }

  return {
    tier: profile.plan as PlanTier,
    usage,
    remaining,
    features: config.features,
  }
}

/** Implementation of getPlanState — runs on server only. */
export async function getPlanStateImpl(): Promise<PlanState | null> {
  const profile = await getCurrentUserProfile()
  if (!profile) return null

  const leadsCount = await countUserLeads(profile.id)
  return buildPlanState(profile, leadsCount)
}

/** Implementation of enforceLimit — runs on server only. */
export async function enforceLimitImpl(metric: LimitMetric): Promise<void> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')

  const config = PLAN_CONFIGS[profile.plan as PlanTier] ?? PLAN_CONFIGS.free
  const { max } = config.limits[metric]
  if (max === null) return

  // For leads, count dynamically from the leads table
  if (metric === 'leads') {
    const leadsCount = await countUserLeads(profile.id)
    if (leadsCount >= max) {
      const requiredTier = minTierForLimit(metric, leadsCount + 1)
      const err = new Error(
        `Plan limit reached: ${metric} (${leadsCount}/${max}) on the ${profile.plan} plan.` +
          (requiredTier ? ` Upgrade to ${requiredTier}.` : ''),
      )
      err.name = 'PlanLimitError'
      Object.assign(err, { metric, currentTier: profile.plan, requiredTier, used: leadsCount, max })
      throw err
    }
    return
  }

  const used =
    metric === 'agents'
      ? profile.agents_count
      : metric === 'conversations'
        ? profile.conversations_count
        : metric === 'messages'
          ? profile.messages_count
          : metric === 'posts'
            ? profile.posts_count
            : metric === 'whatsappMessages'
              ? profile.whatsapp_messages_count ?? 0
              : metric === 'telegramMessages'
                ? profile.telegram_messages_count ?? 0
                : profile.documents_count

  if (used >= max) {
    const requiredTier = minTierForLimit(metric, used + 1)
    const maxLabel = max === null ? 'unlimited' : String(max)
    const err = new Error(
      `Plan limit reached: ${metric} (${used}/${maxLabel}) on the ${profile.plan} plan.` +
        (requiredTier ? ` Upgrade to ${requiredTier}.` : ''),
    )
    err.name = 'PlanLimitError'
    Object.assign(err, {
      metric,
      currentTier: profile.plan,
      requiredTier,
      used,
      max,
    })
    throw err
  }
}

/** Implementation of requireFeature — runs on server only. */
export async function requireFeatureImpl(feature: string): Promise<void> {
  const profile = await getCurrentUserProfile()
  if (!profile) throw new Error('Not authenticated')

  const config = PLAN_CONFIGS[profile.plan as PlanTier] ?? PLAN_CONFIGS.free
  if (!(config.features as Record<string, boolean>)[feature]) {
    const requiredTier = minTierForFeature(feature as never)
    const err = new Error(
      `Feature "${feature}" is not available on the ${profile.plan} plan.` +
        (requiredTier ? ` Upgrade to ${requiredTier}.` : ''),
    )
    err.name = 'FeatureNotAvailableError'
    Object.assign(err, { feature, currentTier: profile.plan, requiredTier })
    throw err
  }
}
