import { getSupabaseServerClient } from '@/lib/supabase/server.server'

export interface AnalyticsTrends {
  totalUsers: number
  totalAgents: number
  totalConversations: number
  totalMessages: number
  totalLeads: number
  totalDeals: number
  totalPosts: number
  totalDocuments: number
  activeAgents: number
  pipelineValue: number
  growth: {
    users: number
    agents: number
    conversations: number
    messages: number
    leads: number
  }
}

export async function getAnalyticsTrendsImpl(): Promise<AnalyticsTrends | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: stats } = await supabase.rpc('get_dashboard_stats', {
    p_user_id: user.id,
  })
  if (!stats) return null

  const typedStats = stats as {
    agents: number
    active_agents: number
    conversations: number
    messages: number
    leads: number
    new_leads: number
    deals: number
    open_deals: number
    pipeline_value: number
    scheduled_posts: number
    documents: number
  }

  // Compute growth deltas from recent creation dates
  const now = new Date()
  const lastWeek = new Date(now.getTime() - 7 * 86400000).toISOString()
  const weekBefore = new Date(now.getTime() - 14 * 86400000).toISOString()

  const [agentsThisWeek, agentsLastWeek, convosThisWeek, convosLastWeek, leadsThisWeek, leadsLastWeek] =
    await Promise.all([
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', lastWeek),
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', weekBefore).lt('created_at', lastWeek),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', lastWeek),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', weekBefore).lt('created_at', lastWeek),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', lastWeek),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).gte('created_at', weekBefore).lt('created_at', lastWeek),
    ])

  function growthPct(current: number | null, previous: number | null): number {
    const cur = current ?? 0
    const prev = previous ?? 0
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const growth = {
    users: 0,
    agents: growthPct(agentsThisWeek.count, agentsLastWeek.count),
    conversations: growthPct(convosThisWeek.count, convosLastWeek.count),
    messages: 0,
    leads: growthPct(leadsThisWeek.count, leadsLastWeek.count),
  }

  return {
    totalUsers: 1,
    totalAgents: typedStats.agents,
    totalConversations: typedStats.conversations,
    totalMessages: typedStats.messages,
    totalLeads: typedStats.leads,
    totalDeals: typedStats.deals,
    totalPosts: typedStats.scheduled_posts,
    totalDocuments: typedStats.documents,
    activeAgents: typedStats.active_agents,
    pipelineValue: typedStats.pipeline_value,
    growth,
  }
}
