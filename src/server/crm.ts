/**
 * Public server functions for the CRM module.
 * Client-callable via RPC. Implementations live in crm.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'

// Re-export all types so the client can import them from here
export type {
  LeadRow,
  DealRow,
  ReminderRow,
  LeadStatus,
  LeadSourceType,
  DealStage,
  ReminderStatusType,
  CreateLeadInput,
  UpdateLeadInput,
  CreateDealInput,
  CreateReminderInput,
} from '@/server/crm.server'

import type {
  CreateLeadInput,
  UpdateLeadInput,
  CreateDealInput,
  CreateReminderInput,
  LeadStatus,
  DealStage,
  ReminderStatusType,
} from '@/server/crm.server'

// ---- Leads ----
export const getLeads = createServerFn({ method: 'GET' }).handler(async () => {
  const { getLeadsImpl } = await import('./crm.server')
  return getLeadsImpl()
})

export const createLead = createServerFn({ method: 'POST' })
  .validator((d: CreateLeadInput) => d)
  .handler(async ({ data }) => {
    const { enforceLimitImpl } = await import('./profile.server')
    await enforceLimitImpl('leads')

    const { createLeadImpl } = await import('./crm.server')
    return createLeadImpl(data)
  })

export const updateLead = createServerFn({ method: 'POST' })
  .validator((d: UpdateLeadInput) => d)
  .handler(async ({ data }) => {
    const { updateLeadImpl } = await import('./crm.server')
    return updateLeadImpl(data)
  })

export const deleteLead = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { deleteLeadImpl } = await import('./crm.server')
    return deleteLeadImpl(data.id)
  })

export const getTodaysLeads = createServerFn({ method: 'GET' }).handler(async () => {
  const { getTodaysLeadsImpl } = await import('./crm.server')
  return getTodaysLeadsImpl()
})

// ---- Deals ----
export const getDeals = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDealsImpl } = await import('./crm.server')
  return getDealsImpl()
})

export const createDeal = createServerFn({ method: 'POST' })
  .validator((d: CreateDealInput) => d)
  .handler(async ({ data }) => {
    const { createDealImpl } = await import('./crm.server')
    return createDealImpl(data)
  })

export const updateDealStage = createServerFn({ method: 'POST' })
  .validator((d: { dealId: string; stage: DealStage }) => d)
  .handler(async ({ data }) => {
    const { updateDealStageImpl } = await import('./crm.server')
    return updateDealStageImpl(data.dealId, data.stage)
  })

// ---- Reminders ----
export const getReminders = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getRemindersImpl } = await import('./crm.server')
    return getRemindersImpl()
  },
)

export const createReminder = createServerFn({ method: 'POST' })
  .validator((d: CreateReminderInput) => d)
  .handler(async ({ data }) => {
    const { createReminderImpl } = await import('./crm.server')
    return createReminderImpl(data)
  })

export const updateReminderStatus = createServerFn({ method: 'POST' })
  .validator((d: { reminderId: string; status: ReminderStatusType }) => d)
  .handler(async ({ data }) => {
    const { updateReminderStatusImpl } = await import('./crm.server')
    return updateReminderStatusImpl(data.reminderId, data.status)
  })

// Status/stage constants for UI dropdowns
export const LEAD_STATUSES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: '#3b82f6' },
  { value: 'contacted', label: 'Contacted', color: '#8b5cf6' },
  { value: 'qualified', label: 'Qualified', color: '#6366f1' },
  { value: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { value: 'won', label: 'Won', color: '#10b981' },
  { value: 'lost', label: 'Lost', color: '#ef4444' },
]

export const DEAL_STAGES: { value: DealStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: '#3b82f6' },
  { value: 'qualified', label: 'Qualified', color: '#8b5cf6' },
  { value: 'proposal', label: 'Proposal', color: '#6366f1' },
  { value: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
  { value: 'closed_won', label: 'Closed Won', color: '#10b981' },
  { value: 'closed_lost', label: 'Closed Lost', color: '#ef4444' },
]
