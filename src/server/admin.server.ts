/**
 * Server-only implementation for the admin dashboard.
 *
 * All functions check that the current user has admin/owner role before
 * returning data. Uses the user's session (not service role) so RLS still
 * applies — the is_admin() helper grants access to all rows.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import type { PlanTier } from '@/lib/plans'
import type { AnalyticsTrends } from '@/server/analytics'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string
  email: string
  full_name: string | null
  plan: PlanTier
  role: 'member' | 'admin' | 'owner'
  agents_count: number
  conversations_count: number
  messages_count: number
  posts_count: number
  documents_count: number
  created_at: string
}

export interface AdminAgentTypeRow {
  key: string
  label: string
  description: string | null
  icon: string | null
  accent_color: string
  system_prompt: string
  is_active: boolean
  sort_order: number
}

export interface AdminStats {
  totalUsers: number
  totalAgents: number
  totalConversations: number
  totalMessages: number
  totalLeads: number
  totalPosts: number
  totalDocuments: number
  usersByPlan: Record<string, number>
  agentsByType: Record<string, number>
  recentSignups: number
}

export interface AdminSystemHealth {
  agentStatus: Record<string, number>
  tokenUsage: {
    tokensIn: number
    tokensOut: number
    totalTokens: number
    estimatedCost: number
  }
  usageTrend: {
    last24h: number
    last7d: number
    last30d: number
  }
  activeUsers: number
  recentLogs: SystemLogEntry[]
}

export interface SystemLogEntry {
  id: string
  type: 'agent_created' | 'conversation' | 'lead_captured' | 'message' | 'user_joined'
  summary: string
  userEmail: string
  createdAt: string
}

export interface AdminBillingStats {
  estimatedMonthlyRevenue: number
  revenueByPlan: Record<string, number>
  subscriptionsByStatus: Record<string, { count: number; label: string }>
  trialUsers: number
  totalUsage: {
    agents: number
    conversations: number
    messages: number
  }
}

// ---------------------------------------------------------------------------
// Auth guard — ensures only admins can access these functions
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
    throw new Error('Admin access required')
  }

  return user
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function checkAdminAccessImpl(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch {
    return false
  }
}

export async function getAdminStatsImpl(): Promise<AdminStats | { error: string }> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    // Fetch counts in parallel
    const [usersRes, agentsRes, convosRes, msgsRes, leadsRes, postsRes, docsRes] =
      await Promise.all([
        supabase.from('profiles').select('plan', { count: 'exact', head: true }),
        supabase.from('agents').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
      ])

    // Users by plan
    const { data: planData } = await supabase.from('profiles').select('plan')
    const usersByPlan: Record<string, number> = {}
    for (const p of planData ?? []) {
      usersByPlan[p.plan] = (usersByPlan[p.plan] ?? 0) + 1
    }

    // Agents by type
    const { data: agentTypes } = await supabase.from('agents').select('type')
    const agentsByType: Record<string, number> = {}
    for (const a of agentTypes ?? []) {
      agentsByType[a.type] = (agentsByType[a.type] ?? 0) + 1
    }

    // Recent signups (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { count: recentSignups } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)

    return {
      totalUsers: usersRes.count ?? 0,
      totalAgents: agentsRes.count ?? 0,
      totalConversations: convosRes.count ?? 0,
      totalMessages: msgsRes.count ?? 0,
      totalLeads: leadsRes.count ?? 0,
      totalPosts: postsRes.count ?? 0,
      totalDocuments: docsRes.count ?? 0,
      usersByPlan,
      agentsByType,
      recentSignups: recentSignups ?? 0,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to load stats',
    }
  }
}

// ---------------------------------------------------------------------------
// User management
// ---------------------------------------------------------------------------

export async function getAdminUsersImpl(): Promise<
  AdminUserRow[] | { error: string }
> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, email, full_name, plan, role, agents_count, conversations_count, messages_count, posts_count, documents_count, created_at',
      )
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return data as unknown as AdminUserRow[]
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to load users',
    }
  }
}

export async function updateUserRoleImpl(input: {
  userId: string
  role: 'member' | 'admin' | 'owner'
}): Promise<{ error: string } | null> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('profiles')
      .update({ role: input.role })
      .eq('id', input.userId)

    if (error) return { error: error.message }
    return null
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to update role',
    }
  }
}

export async function updateUserPlanImpl(input: {
  userId: string
  plan: PlanTier
}): Promise<{ error: string } | null> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const { error } = await supabase
      .from('profiles')
      .update({ plan: input.plan })
      .eq('id', input.userId)

    if (error) return { error: error.message }
    return null
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to update plan',
    }
  }
}

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

export async function getSystemHealthImpl(): Promise<
  AdminSystemHealth | { error: string }
> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    // Agent status distribution
    const { data: agentData } = await supabase.from('agents').select('status')
    const agentStatus: Record<string, number> = {}
    for (const a of agentData ?? []) {
      agentStatus[a.status] = (agentStatus[a.status] ?? 0) + 1
    }

    // Token usage
    const { data: tokenData } = await supabase
      .from('messages')
      .select('tokens_in, tokens_out')

    let tokensIn = 0
    let tokensOut = 0
    for (const m of tokenData ?? []) {
      tokensIn += m.tokens_in ?? 0
      tokensOut += m.tokens_out ?? 0
    }
    const totalTokens = tokensIn + tokensOut
    // Cost estimate: DeepSeek ~$0.14/M input, $0.28/M output
    const estimatedCost = (tokensIn / 1_000_000) * 0.14 + (tokensOut / 1_000_000) * 0.28

    // Usage trends
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 86400000).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    const [msgs24h, msgs7d, msgs30d] = await Promise.all([
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
    ])

    // Active users (users with activity in last 7 days)
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id')

    // Recent system activity (cross-entity logs)
    const [recentAgents, recentConvos, recentLeads, recentUsers] = await Promise.all([
      supabase
        .from('agents')
        .select('id, name, status, created_at, owner_id')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('conversations')
        .select('id, title, created_at, owner_id')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('leads')
        .select('id, name, created_at, owner_id')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const logs: SystemLogEntry[] = []

    for (const a of recentAgents.data ?? []) {
      logs.push({
        id: `agent-${a.id}`,
        type: 'agent_created',
        summary: `Agent "${a.name}" created (${a.status})`,
        userEmail: a.owner_id,
        createdAt: a.created_at,
      })
    }
    for (const c of recentConvos.data ?? []) {
      logs.push({
        id: `conv-${c.id}`,
        type: 'conversation',
        summary: `Conversation: "${c.title}"`,
        userEmail: c.owner_id,
        createdAt: c.created_at,
      })
    }
    for (const l of recentLeads.data ?? []) {
      logs.push({
        id: `lead-${l.id}`,
        type: 'lead_captured',
        summary: `Lead: ${l.name}`,
        userEmail: l.owner_id,
        createdAt: l.created_at,
      })
    }
    for (const u of recentUsers.data ?? []) {
      logs.push({
        id: `user-${u.id}`,
        type: 'user_joined',
        summary: `User joined: ${u.email}`,
        userEmail: u.email,
        createdAt: u.created_at,
      })
    }

    logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const topLogs = logs.slice(0, 15)

    return {
      agentStatus,
      tokenUsage: {
        tokensIn,
        tokensOut,
        totalTokens,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
      },
      usageTrend: {
        last24h: msgs24h.count ?? 0,
        last7d: msgs7d.count ?? 0,
        last30d: msgs30d.count ?? 0,
      },
      activeUsers: activeUsers?.length ?? 0,
      recentLogs: topLogs,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to load system health',
    }
  }
}

// ---------------------------------------------------------------------------
// Billing stats
// ---------------------------------------------------------------------------

export async function getAdminBillingImpl(): Promise<
  AdminBillingStats | { error: string }
> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const { data: profiles } = await supabase
      .from('profiles')
      .select('plan, subscription_status, trial_ends_at, agents_count, conversations_count, messages_count')

    if (!profiles) {
      return { error: 'Failed to load billing data' }
    }

    const PLAN_PRICES: Record<string, number> = {
      free: 0,
      lite: 29,
      pro: 99,
    }

    let totalMessages = 0
    let totalConversations = 0
    let totalAgents = 0
    let trialUsers = 0
    const revenueByPlan: Record<string, number> = {}
    const subscriptionsByStatus: Record<string, { count: number; label: string }> = {}

    for (const p of profiles) {
      totalAgents += p.agents_count ?? 0
      totalConversations += p.conversations_count ?? 0
      totalMessages += p.messages_count ?? 0

      if (p.trial_ends_at && new Date(p.trial_ends_at) > new Date()) {
        trialUsers++
      }

      const price = PLAN_PRICES[p.plan] ?? 0
      revenueByPlan[p.plan] = (revenueByPlan[p.plan] ?? 0) + price

      const status = p.subscription_status ?? 'inactive'
      if (!subscriptionsByStatus[status]) {
        subscriptionsByStatus[status] = { count: 0, label: status.replace('_', ' ') }
      }
      subscriptionsByStatus[status].count++
    }

    const estimatedMonthlyRevenue = Object.values(revenueByPlan).reduce((a, b) => a + b, 0)

    return {
      estimatedMonthlyRevenue,
      revenueByPlan,
      subscriptionsByStatus,
      trialUsers,
      totalUsage: {
        agents: totalAgents,
        conversations: totalConversations,
        messages: totalMessages,
      },
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to load billing data',
    }
  }
}

// ---------------------------------------------------------------------------
// Agent type config management
// ---------------------------------------------------------------------------

export async function getAgentTypeConfigsImpl(): Promise<
  AdminAgentTypeRow[] | { error: string }
> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from('agent_types')
      .select(
        'key, label, description, icon, accent_color, system_prompt, is_active, sort_order',
      )
      .order('sort_order')

    if (error) return { error: error.message }
    return data as unknown as AdminAgentTypeRow[]
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to load configs',
    }
  }
}

export async function updateAgentTypeConfigImpl(input: {
  key: string
  label?: string
  description?: string
  systemPrompt?: string
  isActive?: boolean
}): Promise<{ error: string } | null> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const updates: Record<string, string | boolean> = {}
    if (input.label !== undefined) updates.label = input.label
    if (input.description !== undefined) updates.description = input.description
    if (input.systemPrompt !== undefined) updates.system_prompt = input.systemPrompt
    if (input.isActive !== undefined) updates.is_active = input.isActive

    const { error } = await supabase
      .from('agent_types')
      .update(updates)
      .eq('key', input.key)

    if (error) return { error: error.message }
    return null
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to update config',
    }
  }
}

// ---------------------------------------------------------------------------
// Platform-wide Analytics (admin)
// ---------------------------------------------------------------------------

export async function getAdminAnalyticsImpl(): Promise<
  AnalyticsTrends | { error: string }
> {
  try {
    await requireAdmin()
    const supabase = getSupabaseServerClient()

    const [agentsRes, convosRes, msgsRes, leadsRes, postsRes, docsRes, dealsRes, profilesRes] =
      await Promise.all([
        supabase.from('agents').select('status, created_at'),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('value, created_at'),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('deals').select('value'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])

    const totalAgents = agentsRes.data?.length ?? 0
    const activeAgents = agentsRes.data?.filter((a) => a.status === 'active').length ?? 0
    const totalConversations = convosRes.count ?? 0
    const totalMessages = msgsRes.count ?? 0
    const totalLeads = leadsRes.data?.length ?? 0
    const totalPosts = postsRes.count ?? 0
    const totalDocuments = docsRes.count ?? 0
    const totalDeals = dealsRes.data?.length ?? 0
    const pipelineValue = dealsRes.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
    const totalUsers = profilesRes.count ?? 0

    // Week-over-week growth (platform-wide, no user filter)
    const now = new Date()
    const lastWeek = new Date(now.getTime() - 7 * 86400000).toISOString()
    const weekBefore = new Date(now.getTime() - 14 * 86400000).toISOString()

    const [usersThisWeek, usersLastWeek, agentsThisWeek, agentsLastWeek, convosThisWeek, convosLastWeek, leadsThisWeek, leadsLastWeek, msgsThisWeek, msgsLastWeek] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', lastWeek),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekBefore).lt('created_at', lastWeek),
        supabase.from('agents').select('id', { count: 'exact', head: true }).gte('created_at', lastWeek),
        supabase.from('agents').select('id', { count: 'exact', head: true }).gte('created_at', weekBefore).lt('created_at', lastWeek),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('created_at', lastWeek),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('created_at', weekBefore).lt('created_at', lastWeek),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', lastWeek),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekBefore).lt('created_at', lastWeek),
        supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', lastWeek),
        supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', weekBefore).lt('created_at', lastWeek),
      ])

    function growthPct(current: number | null, previous: number | null): number {
      const cur = current ?? 0
      const prev = previous ?? 0
      if (prev === 0) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / prev) * 100)
    }

    return {
      totalUsers,
      totalAgents,
      totalConversations,
      totalMessages,
      totalLeads,
      totalDeals,
      totalPosts,
      totalDocuments,
      activeAgents,
      pipelineValue,
      growth: {
        users: growthPct(usersThisWeek.count, usersLastWeek.count),
        agents: growthPct(agentsThisWeek.count, agentsLastWeek.count),
        conversations: growthPct(convosThisWeek.count, convosLastWeek.count),
        messages: growthPct(msgsThisWeek.count, msgsLastWeek.count),
        leads: growthPct(leadsThisWeek.count, leadsLastWeek.count),
      },
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to load analytics',
    }
  }
}
