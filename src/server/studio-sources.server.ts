import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { sanitizeSupabaseMessage } from '@/server/_errors'

export type StudioSourceKind = 'listing' | 'crm' | 'knowledge'
export interface StudioSource {
  id: string
  owner_id: string
  kind: StudioSourceKind
  title: string
  facts: string
  reference_url: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type StudioSourceSnapshot = Pick<StudioSource, 'id' | 'kind' | 'title' | 'facts' | 'reference_url' | 'updated_at'>

export async function listStudioSourcesImpl(): Promise<StudioSource[]> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('studio_approved_sources').select('*')
    .eq('owner_id', user.id).order('created_at', { ascending: false })
  return (data ?? []) as StudioSource[]
}

export async function loadApprovedSources(ownerId: string, ids: string[]): Promise<StudioSourceSnapshot[] | { error: string }> {
  if (!Array.isArray(ids) || ids.length > 5 || new Set(ids).size !== ids.length ||
    ids.some((id) => typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))) {
    return { error: 'Choose up to five different approved sources.' }
  }
  if (!ids.length) return []
  const { data, error } = await getSupabaseServerClient().from('studio_approved_sources')
    .select('id, kind, title, facts, reference_url, updated_at')
    .eq('owner_id', ownerId).not('approved_at', 'is', null).in('id', ids)
  if (error || data?.length !== ids.length) return { error: 'A selected source is missing or no longer approved. Review your sources and generate again.' }
  const byId = new Map(data.map((source) => [source.id, source as StudioSourceSnapshot]))
  return ids.map((id) => byId.get(id)!)
}

export async function saveStudioSourceImpl(input: {
  id?: string; kind: StudioSourceKind; title: string; facts: string; referenceUrl?: string; approved: boolean
}): Promise<StudioSource | { error: string }> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const title = input.title?.trim()
  const facts = input.facts?.trim()
  const referenceUrl = input.referenceUrl?.trim() || null
  if (!['listing', 'crm', 'knowledge'].includes(input.kind) || !title || title.length > 120 || !facts || facts.length > 4000) {
    return { error: 'Add a title (up to 120 characters) and facts (up to 4,000 characters).' }
  }
  if (referenceUrl && (referenceUrl.length > 500 || !/^https?:\/\//i.test(referenceUrl))) {
    return { error: 'Use a valid http or https reference link.' }
  }
  if (typeof input.approved !== 'boolean') return { error: 'Choose whether the facts are approved for public posts.' }
  const values = {
    kind: input.kind, title, facts, reference_url: referenceUrl,
    approved_at: input.approved ? new Date().toISOString() : null,
  }
  const query = input.id
    ? supabase.from('studio_approved_sources').update(values).eq('id', input.id).eq('owner_id', user.id)
    : supabase.from('studio_approved_sources').insert({ ...values, owner_id: user.id })
  const { data, error } = await query.select('*').single()
  if (error || !data) return { error: sanitizeSupabaseMessage(error?.message ?? 'Could not save source.', 'Could not save source.') }
  return data as StudioSource
}

export async function deleteStudioSourceImpl(id: string): Promise<null | { error: string }> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase.from('studio_approved_sources').delete()
    .eq('id', id).eq('owner_id', user.id).select('id')
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Could not delete source.') }
  if (!data?.length) return { error: 'Source not found.' }
  return null
}
