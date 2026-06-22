/**
 * Public server functions for the admin dashboard.
 * Client-callable via RPC. Implementations live in admin.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

export type {
  AdminUserRow,
  AdminAgentTypeRow,
  AdminStats,
  AdminBillingStats,
  AdminSystemHealth,
  SystemLogEntry,
} from '@/server/admin.server'

export type { AnalyticsTrends } from '@/server/analytics'

import type { PlanTier } from '@/lib/plans'

export const checkAdminAccess = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { checkAdminAccessImpl } = await import('./admin.server')
    return checkAdminAccessImpl()
  },
)

export const getAdminStats = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAdminStatsImpl } = await import('./admin.server')
    return getAdminStatsImpl()
  },
)

export const getAdminUsers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAdminUsersImpl } = await import('./admin.server')
    return getAdminUsersImpl()
  },
)

export const updateUserRole = createServerFn({ method: 'POST' })
  .validator((d: { userId: string; role: 'member' | 'admin' | 'owner' }) => d)
  .handler(async ({ data }) => {
    const { updateUserRoleImpl } = await import('./admin.server')
    return updateUserRoleImpl(data)
  })

export const updateUserPlan = createServerFn({ method: 'POST' })
  .validator((d: { userId: string; plan: PlanTier }) => d)
  .handler(async ({ data }) => {
    const { updateUserPlanImpl } = await import('./admin.server')
    return updateUserPlanImpl(data)
  })

export const getAgentTypeConfigs = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAgentTypeConfigsImpl } = await import('./admin.server')
    return getAgentTypeConfigsImpl()
  },
)

export const getSystemHealth = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSystemHealthImpl } = await import('./admin.server')
    return getSystemHealthImpl()
  },
)

export const getAdminBilling = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAdminBillingImpl } = await import('./admin.server')
    return getAdminBillingImpl()
  },
)

export const updateAgentTypeConfig = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      key: string
      label?: string
      description?: string
      systemPrompt?: string
      isActive?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const { updateAgentTypeConfigImpl } = await import('./admin.server')
    return updateAgentTypeConfigImpl(data)
  })

export const getAdminAnalytics = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAdminAnalyticsImpl } = await import('./admin.server')
    return getAdminAnalyticsImpl()
  },
)
