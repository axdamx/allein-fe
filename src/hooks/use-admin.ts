import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  updateUserPlan,
  getAgentTypeConfigs,
  updateAgentTypeConfig,
  getAdminBilling,
  getSystemHealth,
  getAdminAnalytics,
  type AdminStats,
  type AdminUserRow,
  type AdminAgentTypeRow,
  type AdminBillingStats,
  type AdminSystemHealth,
  type AnalyticsTrends,
} from '@/server/admin'
import type { PlanTier } from '@/lib/plans'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => getAdminStats(),
    staleTime: 30 * 1000,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => getAdminUsers(),
    staleTime: 20 * 1000,
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; role: 'member' | 'admin' | 'owner' }) =>
      updateUserRole({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Role updated')
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useUpdateUserPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; plan: PlanTier }) =>
      updateUserPlan({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Plan updated')
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: () => getSystemHealth(),
    staleTime: 60 * 1000,
  })
}

export function useAdminBilling() {
  return useQuery({
    queryKey: ['admin', 'billing'],
    queryFn: () => getAdminBilling(),
    staleTime: 60 * 1000,
  })
}

export function useAgentTypeConfigs() {
  return useQuery({
    queryKey: ['admin', 'agent-types'],
    queryFn: () => getAgentTypeConfigs(),
    staleTime: 60 * 1000,
  })
}

export function useUpdateAgentTypeConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      key: string
      label?: string
      description?: string
      systemPrompt?: string
      isActive?: boolean
    }) => updateAgentTypeConfig({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Agent type updated')
      qc.invalidateQueries({ queryKey: ['admin', 'agent-types'] })
      qc.invalidateQueries({ queryKey: ['agent-types'] })
    },
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => getAdminAnalytics(),
    staleTime: 60 * 1000,
  })
}

export type { AdminStats, AdminUserRow, AdminAgentTypeRow, AdminBillingStats, AdminSystemHealth, AnalyticsTrends }
