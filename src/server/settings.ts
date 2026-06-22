/** Public server functions for the settings page. */
import { createServerFn } from '@tanstack/react-start'
import type { PlanTier } from '@/lib/plans'
import type { AgentTypeKey } from '@/lib/agent-types'

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  phone: string | null
  plan: PlanTier
  role: 'member' | 'admin' | 'owner'
  agent_type: AgentTypeKey | null
  telegram_chat_id: string | null
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
      telegramChatId?: string | null
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

export const updateUserAgentType = createServerFn({ method: 'POST' })
  .validator((d: { agentType: AgentTypeKey }) => d)
  .handler(async ({ data }) => {
    const { updateUserAgentTypeImpl } = await import('./settings.server')
    return updateUserAgentTypeImpl(data.agentType)
  })
