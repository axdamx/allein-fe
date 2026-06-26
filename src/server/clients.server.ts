/**
 * Server-only implementation for the Clients module.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClientStatus = 'active' | 'inactive' | 'churned'

export interface ClientRow {
  id: string
  owner_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  website: string | null
  industry: string | null
  status: ClientStatus
  notes: string | null
  tags: string[]
  date_of_birth: string | null
  created_at: string
  updated_at: string
}

export interface CreateClientInput {
  name: string
  email?: string
  phone?: string
  company?: string
  website?: string
  industry?: string
  status?: ClientStatus
  notes?: string
  tags?: string[]
  date_of_birth?: string
}

export interface UpdateClientInput {
  id: string
  name?: string
  email?: string
  phone?: string
  company?: string
  website?: string
  industry?: string
  status?: ClientStatus
  notes?: string
  tags?: string[]
  date_of_birth?: string
}

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

export async function getClientsImpl(): Promise<ClientRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as ClientRow[]
}

export async function getClientsPaginatedImpl({
  page,
  pageSize,
  search,
}: {
  page: number
  pageSize: number
  search?: string
}): Promise<{ data: ClientRow[]; total: number }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: [], total: 0 }

  const term = search ? `%${search}%` : null

  // Count total matching
  let countQuery = supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)

  if (term) {
    countQuery = countQuery.or(
      `name.ilike.${term},email.ilike.${term},company.ilike.${term},industry.ilike.${term}`,
    )
  }

  const { count } = await countQuery

  // Fetch page
  let dataQuery = supabase
    .from('clients')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (term) {
    dataQuery = dataQuery.or(
      `name.ilike.${term},email.ilike.${term},company.ilike.${term},industry.ilike.${term}`,
    )
  }

  const { data, error } = await dataQuery
  if (error || !data) return { data: [], total: 0 }

  return { data: data as unknown as ClientRow[], total: count ?? 0 }
}

export async function getClientByIdImpl(
  id: string,
): Promise<ClientRow | null> {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as unknown as ClientRow
}

export async function getClientsByBirthdayRangeImpl({
  withinMonths,
}: {
  withinMonths: number
}): Promise<ClientRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase.rpc('clients_upcoming_birthdays', {
    p_owner_id: user.id,
    p_months: withinMonths,
  })
  if (error || !data) return []
  return data as unknown as ClientRow[]
}

export async function createClientImpl(
  input: CreateClientInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      owner_id: user.id,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      website: input.website ?? null,
      industry: input.industry ?? null,
      status: input.status ?? 'active',
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      date_of_birth: input.date_of_birth ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}

export async function updateClientImpl(
  input: UpdateClientInput,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { id, ...updates } = input

  const cleanUpdates: Record<string, string | number | string[] | null> = {}
  if (updates.name !== undefined) cleanUpdates.name = updates.name
  if (updates.email !== undefined) cleanUpdates.email = updates.email
  if (updates.phone !== undefined) cleanUpdates.phone = updates.phone
  if (updates.company !== undefined) cleanUpdates.company = updates.company
  if (updates.website !== undefined) cleanUpdates.website = updates.website
  if (updates.industry !== undefined) cleanUpdates.industry = updates.industry
  if (updates.status !== undefined) cleanUpdates.status = updates.status
  if (updates.notes !== undefined) cleanUpdates.notes = updates.notes
  if (updates.tags !== undefined) cleanUpdates.tags = updates.tags
  if (updates.date_of_birth !== undefined) cleanUpdates.date_of_birth = updates.date_of_birth

  const { error } = await supabase
    .from('clients')
    .update(cleanUpdates)
    .eq('id', id)

  if (error) return { error: error.message }
  return null
}

export async function deleteClientImpl(
  clientId: string,
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) return { error: error.message }
  return null
}
