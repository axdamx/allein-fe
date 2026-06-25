/**
 * Server-only implementation for the CRM module.
 * Handles leads, deals, and reminders — all DB access stays here.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

// ---------------------------------------------------------------------------
// Types — mirror the DB schema, safe for SSR serialization
// ---------------------------------------------------------------------------

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'negotiation'
  | 'won'
  | 'lost'

export type LeadSourceType =
  | 'website'
  | 'whatsapp'
  | 'telegram'
  | 'phone'
  | 'email'
  | 'social'
  | 'referral'
  | 'other'

export type DealStage =
  | 'lead'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'

export type ReminderStatusType = 'pending' | 'sent' | 'snoozed' | 'done'

export interface LeadRow {
  id: string
  owner_id: string
  agent_id: string | null
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: LeadSourceType
  status: LeadStatus
  value: number
  notes: string | null
  tags: string[]
  last_contacted_at: string | null
  scheduled_date: string | null
  created_at: string
  updated_at: string
}

export interface DealRow {
  id: string
  owner_id: string
  lead_id: string | null
  title: string
  stage: DealStage
  value: number
  currency: string
  probability: number
  expected_close_date: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReminderRow {
  id: string
  owner_id: string
  lead_id: string | null
  deal_id: string | null
  title: string
  description: string | null
  due_at: string
  channel: 'in_app' | 'email' | 'whatsapp'
  status: ReminderStatusType
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function getLeadsImpl(): Promise<LeadRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as LeadRow[]
}

export interface CreateLeadInput {
  name: string
  email?: string
  phone?: string
  company?: string
  source?: LeadSourceType
  status?: LeadStatus
  value?: number
  notes?: string
  tags?: string[]
  scheduled_date?: string
}

export async function createLeadImpl(
  input: CreateLeadInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      owner_id: user.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      source: input.source ?? 'website',
      status: input.status ?? 'new',
      value: input.value ?? 0,
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      scheduled_date: input.scheduled_date ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export interface UpdateLeadInput {
  id: string
  name?: string
  email?: string
  phone?: string
  company?: string
  source?: LeadSourceType
  status?: LeadStatus
  value?: number
  notes?: string
  tags?: string[]
  scheduled_date?: string | null
}

export async function updateLeadImpl(
  input: UpdateLeadInput,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { id, ...updates } = input

  const cleanUpdates: Record<string, string | number | string[] | null> = {}
  if (updates.name !== undefined) cleanUpdates.name = updates.name
  if (updates.email !== undefined) cleanUpdates.email = updates.email
  if (updates.phone !== undefined) cleanUpdates.phone = updates.phone
  if (updates.company !== undefined) cleanUpdates.company = updates.company
  if (updates.source !== undefined) cleanUpdates.source = updates.source
  if (updates.status !== undefined) cleanUpdates.status = updates.status
  if (updates.value !== undefined) cleanUpdates.value = updates.value
  if (updates.notes !== undefined) cleanUpdates.notes = updates.notes
  if (updates.tags !== undefined) cleanUpdates.tags = updates.tags
  if (updates.scheduled_date !== undefined) cleanUpdates.scheduled_date = updates.scheduled_date
  cleanUpdates.last_contacted_at = new Date().toISOString()

  const { error } = await supabase
    .from('leads')
    .update(cleanUpdates)
    .eq('id', id)

  if (error) return { error: error.message }
  return null
}

export async function deleteLeadImpl(
  leadId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from('leads').delete().eq('id', leadId)
  if (error) return { error: error.message }
  return null
}

export async function getTodaysLeadsImpl(): Promise<LeadRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('owner_id', user.id)
    .eq('scheduled_date', today)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as LeadRow[]
}

// ---------------------------------------------------------------------------
// Deals
// ---------------------------------------------------------------------------

export async function getDealsImpl(): Promise<DealRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as DealRow[]
}

export interface CreateDealInput {
  title: string
  lead_id?: string
  stage?: DealStage
  value: number
  probability?: number
  expected_close_date?: string
}

export async function createDealImpl(
  input: CreateDealInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('deals')
    .insert({
      owner_id: user.id,
      title: input.title,
      lead_id: input.lead_id ?? null,
      stage: input.stage ?? 'lead',
      value: input.value,
      probability: input.probability ?? 0,
      expected_close_date: input.expected_close_date ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function updateDealStageImpl(
  dealId: string,
  stage: DealStage,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()

  // Auto-set probability based on stage
  const stageProbability: Record<DealStage, number> = {
    lead: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    closed_won: 100,
    closed_lost: 0,
  }

  const { error } = await supabase
    .from('deals')
    .update({
      stage,
      probability: stageProbability[stage],
      ...(stage === 'closed_won' || stage === 'closed_lost'
        ? {}
        : {}),
    })
    .eq('id', dealId)

  if (error) return { error: error.message }
  return null
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export async function getRemindersImpl(): Promise<ReminderRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('owner_id', user.id)
    .order('due_at', { ascending: true })

  if (error || !data) return []
  return data as unknown as ReminderRow[]
}

export interface CreateReminderInput {
  title: string
  description?: string
  due_at: string
  channel?: 'in_app' | 'email' | 'whatsapp'
  lead_id?: string
}

export async function createReminderImpl(
  input: CreateReminderInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('reminders')
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description ?? null,
      due_at: input.due_at,
      channel: input.channel ?? 'in_app',
      lead_id: input.lead_id ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function updateReminderStatusImpl(
  reminderId: string,
  status: ReminderStatusType,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('reminders')
    .update({ status })
    .eq('id', reminderId)
  if (error) return { error: error.message }
  return null
}
