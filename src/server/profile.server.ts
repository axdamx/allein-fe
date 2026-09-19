/**
 * Server-only implementation for profile / plan operations.
 *
 * This file is .server.ts so TanStack Start never bundles it into client
 * code. The public server functions in profile.ts re-export thin wrappers
 * that the client calls via RPC.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { PLAN_CONFIGS, minTierForFeature, minTierForLimit } from '@/lib/plans'
import type { PlanTier, LimitMetric, LimitWindow } from '@/lib/plans'
import type { PlanState } from '@/server/profile'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Local timezone for daily quota windows. All users are in Malaysia; if/when
 * multi-region support lands, make this per-account. Keep it in one place.
 */
export const QUOTA_TIMEZONE = 'Asia/Kuala_Lumpur'

/**
 * Window key for a given window at "now", as a YYYY-MM-DD string suitable for
 * the date column on usage_windows. Computed in the app because Postgres
 * cannot derive a local calendar day from a timestamp without a tz extension.
 *
 * Node's Intl.DateTimeFormat with ` timeZone` + `calendar: 'gregory'` gives
 * the correct local date regardless of the host's TZ env var.
 */
export function windowKeyForWindow(
  window: LimitWindow,
  now: Date = new Date(),
): string | null {
  if (window === 'day') {
    // Parts are formatted with leading zeros where applicable.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: QUOTA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const y = parts.find((p) => p.type === 'year')!.value
    const m = parts.find((p) => p.type === 'month')!.value
    const d = parts.find((p) => p.type === 'day')!.value
    return `${y}-${m}-${d}`
  }
  // 'lifetime' and 'month' are not windowed by usage_windows today.
  return null
}

/**
 * Maps a LimitMetric to the metric string stored in usage_windows.metric.
 * Today they happen to match, but keeping an explicit map avoids drift.
 */
const METRIC_KEY: Record<LimitMetric, string> = {
  agents: 'agents',
  conversations: 'conversations',
  messages: 'messages',
  posts: 'posts',
  documents: 'documents',
  leads: 'leads',
  whatsappMessages: 'whatsapp_messages',
  telegramMessages: 'telegram_messages',
}

export interface ConsumeResult {
  /** Whether the operation was allowed (under the cap). */
  allowed: boolean
  /** Current count for this window after the consume attempt. */
  used: number
  /** Remaining quota in this window. `null` for unlimited tiers. */
  remaining: number | null
  /** Max for this metric on the user's tier. `null` for unlimited. */
  max: number | null
  /** ISO timestamp when the window resets (start of next local day). */
  resetAt: string
}

/**
 * Atomically checks the daily quota for `metric` and consumes one unit if
 * allowed. Race-proof: the underlying conditional upsert serialises on the
 * unique window key — including the first consume of a new day.
 *
 * Returns the resulting quota state. The caller MUST bail out (without
 * performing the metered operation) when `allowed === false`.
 *
 * For lifetime metrics this is a no-op (returns allowed:true) — those are
 * enforced at create-time via enforceLimitImpl, not on the chat hot path.
 *
 * Two call modes:
 *  - Authed user (default): looks up the profile from the request session.
 *  - Explicit `userId`: used by webhook/service-role paths where there is no
 *    user session (e.g. inbound WhatsApp/Telegram triggering the owner's
 *    agent). The plan is looked up via the given supabase client.
 */
export async function consumeQuota(
  metric: LimitMetric,
  opts?: {
    userId?: string
    plan?: PlanTier
    supabase?: SupabaseClient
  },
): Promise<ConsumeResult> {
  let userId: string
  let plan: PlanTier

  if (opts?.userId && opts?.plan) {
    userId = opts.userId
    plan = opts.plan
  } else {
    const profile = await getCurrentUserProfile(opts?.supabase)
    if (!profile) throw new Error('Not authenticated')
    userId = profile.id
    plan = profile.plan as PlanTier
  }

  const config = PLAN_CONFIGS[plan] ?? PLAN_CONFIGS.free
  const limit = config.limits[metric]
  const windowKey = limit.window ? windowKeyForWindow(limit.window) : null

  // Lifetime metrics: not consumed here. Caller should use enforceLimitImpl.
  if (!windowKey) {
    return {
      allowed: true,
      used: 0,
      remaining: limit.max,
      max: limit.max,
      resetAt: new Date(0).toISOString(),
    }
  }

  const supabase = opts?.supabase ?? getSupabaseServerClient()
  const { data, error } = await supabase.rpc('try_consume', {
    p_user_id: userId,
    p_metric: METRIC_KEY[metric],
    p_max: limit.max, // null → unlimited
    p_window_key: windowKey,
  })

  if (error || !data || data.length === 0) {
    // On RPC failure, fail CLOSED for paid limits, OPEN for unlimited.
    if (limit.max === null) {
      return {
        allowed: true,
        used: 0,
        remaining: null,
        max: null,
        resetAt: new Date(0).toISOString(),
      }
    }
    throw new Error(`Failed to consume quota for ${metric}: ${error?.message ?? 'no data'}`)
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

/** Fetch the logged-in user's id + profile row. Returns null if unauthed. */
export async function getCurrentUserProfile(
  supabase: SupabaseClient = getSupabaseServerClient(),
) {
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
async function countUserLeads(
  userId: string,
  supabase: SupabaseClient = getSupabaseServerClient(),
): Promise<number> {
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)
  return count ?? 0
}

/**
 * For each metric whose limit has a window (day), read today's used count
 * from usage_windows. Returns a partial override map in one database round
 * trip. Lifetime metrics are absent and fall back to profile counters.
 */
async function getWindowedUsage(
  userId: string,
  plan: PlanTier,
  supabase: SupabaseClient = getSupabaseServerClient(),
): Promise<Partial<Record<LimitMetric, number>>> {
  const config = PLAN_CONFIGS[plan] ?? PLAN_CONFIGS.free
  const today = windowKeyForWindow('day')
  if (!today) return {}

  const out: Partial<Record<LimitMetric, number>> = {}
  const windowedMetrics = (Object.keys(config.limits) as LimitMetric[]).filter(
    (m) => config.limits[m].window === 'day',
  )

  for (const metric of windowedMetrics) out[metric] = 0

  const { data } = await supabase.rpc('get_window_usage_all', {
    p_user_id: userId,
    p_window_key: today,
  })

  const metricByStorageKey = new Map(
    windowedMetrics.map((metric) => [METRIC_KEY[metric], metric] as const),
  )

  for (const row of data ?? []) {
    const metric = metricByStorageKey.get(row.metric)
    if (metric) out[metric] = Number(row.used ?? 0)
  }
  return out
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
  const supabase = getSupabaseServerClient()
  const profile = await getCurrentUserProfile(supabase)
  if (!profile) return null

  const [leadsCount, windowed] = await Promise.all([
    countUserLeads(profile.id, supabase),
    getWindowedUsage(profile.id, profile.plan as PlanTier, supabase),
  ])
  const state = buildPlanState(profile, leadsCount)

  // Override windowed metrics with today's windowed usage so the UI shows
  // the correct "remaining today" instead of a lifetime counter.
  ;(Object.keys(windowed) as LimitMetric[]).forEach((metric) => {
    const used = windowed[metric] ?? 0
    state.usage[metric] = used
    const max = PLAN_CONFIGS[state.tier].limits[metric].max
    state.remaining[metric] = computeRemaining(used, max)
  })

  return state
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
