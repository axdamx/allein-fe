import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  getDeals,
  createDeal,
  updateDealStage,
  getReminders,
  createReminder,
  updateReminderStatus,
  type LeadRow,
  type DealRow,
  type ReminderRow,
  type CreateLeadInput,
  type UpdateLeadInput,
  type CreateDealInput,
  type CreateReminderInput,
  type DealStage,
  type ReminderStatusType,
} from '@/server/crm'
import { PLAN_CONFIGS } from '@/lib/plans'
import { showUsageWarning } from '@/lib/usage-warnings'
import type { PlanState } from '@/server/profile'

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export function useLeads() {
  return useQuery({
    queryKey: ['crm', 'leads'],
    queryFn: () => getLeads(),
    staleTime: 20 * 1000,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLeadInput) => createLead({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Lead created')
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })

      // Warn if nearing lead limit (reads cached plan state — no extra fetch)
      const ps = qc.getQueryData<PlanState>(['plan-state'])
      if (ps) {
        const max = PLAN_CONFIGS[ps.tier]?.limits?.leads?.max
        if (max) {
          const used = ps.usage?.leads ?? 0
          showUsageWarning({
            metric: 'leads',
            percentUsed: Math.min(100, Math.round((used / max) * 100)),
            remaining: ps.remaining?.leads ?? max,
            tier: ps.tier,
          })
        }
      }
    },
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateLeadInput) => updateLead({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteLead({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['crm', 'leads'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export function useDeals() {
  return useQuery({
    queryKey: ['crm', 'deals'],
    queryFn: () => getDeals(),
    staleTime: 20 * 1000,
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDealInput) => createDeal({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Deal created')
      qc.invalidateQueries({ queryKey: ['crm', 'deals'] })
    },
  })
}

export function useUpdateDealStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { dealId: string; stage: DealStage }) =>
      updateDealStage({ data: vars }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['crm', 'deals'] })
    },
  })
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export function useReminders() {
  return useQuery({
    queryKey: ['crm', 'reminders'],
    queryFn: () => getReminders(),
    staleTime: 20 * 1000,
  })
}

export function useCreateReminder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateReminderInput) =>
      createReminder({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Reminder set')
      qc.invalidateQueries({ queryKey: ['crm', 'reminders'] })
    },
  })
}

export function useUpdateReminderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { reminderId: string; status: ReminderStatusType }) =>
      updateReminderStatus({ data: vars }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['crm', 'reminders'] })
    },
  })
}

export type {
  LeadRow,
  DealRow,
  ReminderRow,
  CreateLeadInput,
  UpdateLeadInput,
  CreateDealInput,
  CreateReminderInput,
}
