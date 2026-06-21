/** Public server functions for the settings page. */
import { createServerFn } from '@tanstack/react-start'
import type { PlanTier } from '@/lib/plans'

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  phone: string | null
  plan: PlanTier
  role: 'member' | 'admin' | 'owner'
}

export const getProfile = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getProfileImpl } = await import('./settings.server')
    return getProfileImpl()
  },
)

export const updateProfile = createServerFn({ method: 'POST' })
  .validator(
    (d: {
      fullName?: string
      company?: string
      phone?: string
      avatarUrl?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const { updateProfileImpl } = await import('./settings.server')
    return updateProfileImpl(data)
  })

export const updatePlan = createServerFn({ method: 'POST' })
  .validator((d: { plan: PlanTier }) => d)
  .handler(async ({ data }) => {
    const { updatePlanImpl } = await import('./settings.server')
    return updatePlanImpl(data.plan)
  })
