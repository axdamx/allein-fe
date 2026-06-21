/** Server-only implementation for dashboard stats. */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

export interface DashboardStats {
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

export async function getDashboardStatsImpl(): Promise<DashboardStats | null> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_user_id: user.id,
  })

  if (error || !data) return null
  return data as DashboardStats
}

export interface RecentActivity {
  id: string
  type: 'agent' | 'lead' | 'conversation' | 'post'
  title: string
  subtitle: string
  created_at: string
}

/** Fetch recent activity across agents + leads for the activity feed. */
export async function getRecentActivityImpl(): Promise<RecentActivity[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // Fetch recent agents + leads in parallel
  const [agentsRes, leadsRes, convosRes] = await Promise.all([
    supabase
      .from('agents')
      .select('id, name, type, status, created_at')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(3),
    supabase
      .from('leads')
      .select('id, name, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('conversations')
      .select('id, title, agent_id, updated_at')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(3),
  ])

  const items: RecentActivity[] = []

  for (const a of agentsRes.data ?? []) {
    items.push({
      id: a.id,
      type: 'agent',
      title: a.name,
      subtitle: `Agent ${a.status}`,
      created_at: a.created_at,
    })
  }
  for (const l of leadsRes.data ?? []) {
    items.push({
      id: l.id,
      type: 'lead',
      title: l.name,
      subtitle: `New lead · ${l.status}`,
      created_at: l.created_at,
    })
  }
  for (const c of convosRes.data ?? []) {
    items.push({
      id: c.id,
      type: 'conversation',
      title: c.title,
      subtitle: 'Conversation',
      created_at: c.updated_at,
    })
  }

  // Sort by most recent and cap at 6
  return items
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
}
