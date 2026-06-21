/** Public server functions for dashboard data. */
import { createServerFn } from '@tanstack/react-start'

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

export interface RecentActivity {
  id: string
  type: 'agent' | 'lead' | 'conversation' | 'post'
  title: string
  subtitle: string
  created_at: string
}

export const getDashboardStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getDashboardStatsImpl } = await import('./dashboard.server')
    return getDashboardStatsImpl()
  },
)

export const getRecentActivity = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getRecentActivityImpl } = await import('./dashboard.server')
    return getRecentActivityImpl()
  },
)
