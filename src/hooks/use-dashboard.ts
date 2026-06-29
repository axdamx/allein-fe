import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getRecentActivity,
  type DashboardStats,
  type RecentActivity,
} from '@/server/dashboard'

/** Aggregated dashboard numbers for stat cards. */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => getDashboardStats(),
    staleTime: 30 * 1000,
  })
}

/** Recent cross-entity activity for the dashboard feed. */
export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => getRecentActivity(),
    staleTime: 30 * 1000,
  })
}

export type { DashboardStats, RecentActivity }
