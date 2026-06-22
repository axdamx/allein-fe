import { createServerFn } from '@tanstack/react-start'

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

export const getAnalyticsTrends = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAnalyticsTrendsImpl } = await import('./analytics.server')
    return getAnalyticsTrendsImpl()
  },
)
