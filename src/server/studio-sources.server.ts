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
export interface StudioSourceCandidate {
  id: string
  kind: 'knowledge' | 'crm'
  title: string
}
export interface StudioSourceCandidatePreview {
  kind: 'knowledge' | 'crm'
  title: string
  facts: string
  referenceUrl: string | null
}

export async function listStudioSourcesImpl(): Promise<StudioSource[]> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('studio_approved_sources').select('*')
    .eq('owner_id', user.id).order('created_at', { ascending: false })
  if (error) throw new Error('Studio sources are unavailable. Check that migration 0033 has been applied.')
  return (data ?? []) as StudioSource[]
}

export async function listStudioSourceCandidatesImpl(): Promise<StudioSourceCandidate[] | { error: string }> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const [documents, clients] = await Promise.all([
    supabase.from('documents').select('id, name').eq('owner_id', user.id).eq('status', 'ready').order('created_at', { ascending: false }).limit(100),
    supabase.from('clients').select('id, name, company').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(100),
  ])
  if (documents.error || clients.error) return { error: 'Could not load knowledge documents or client profiles.' }
  return [
    ...(documents.data ?? []).map((doc) => ({ id: doc.id, kind: 'knowledge' as const, title: doc.name })),
    ...(clients.data ?? []).map((client) => ({ id: client.id, kind: 'crm' as const, title: client.company || client.name })),
  ]
}

export async function previewStudioSourceCandidateImpl(input: {
  id: string; kind: 'knowledge' | 'crm'
}): Promise<StudioSourceCandidatePreview | { error: string }> {
  const supabase = getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (!/^[0-9a-f-]{36}$/i.test(input.id)) return { error: 'Choose a valid source.' }

  if (input.kind === 'knowledge') {
    const { data: doc } = await supabase.from('documents').select('id, name')
      .eq('id', input.id).eq('owner_id', user.id).eq('status', 'ready').maybeSingle()
    if (!doc) return { error: 'Ready knowledge document not found.' }
    const { data: chunks, error } = await supabase.from('document_chunks').select('content')
      .eq('document_id', doc.id).eq('owner_id', user.id).order('chunk_index').limit(10)
    if (error || !chunks?.length) return { error: 'No extracted text found in this document.' }
    return {
      kind: 'knowledge', title: doc.name.slice(0, 120),
      facts: chunks.map((chunk) => chunk.content).join('\n\n').slice(0, 4000),
      referenceUrl: null,
    }
  }

  if (input.kind === 'crm') {
    const { data: client } = await supabase.from('clients').select('id, company, industry, website')
      .eq('id', input.id).eq('owner_id', user.id).maybeSingle()
    if (!client) return { error: 'Client profile not found.' }
    if (!client.company) return { error: 'This client has no company profile. Add verified public facts manually instead.' }
    const facts = [
      `Company: ${client.company}`,
      client.industry && `Industry: ${client.industry}`,
      client.website && `Website: ${client.website}`,
    ].filter(Boolean).join('\n')
    return {
      kind: 'crm', title: client.company.slice(0, 120), facts: facts.slice(0, 4000),
      referenceUrl: `/crm/clients/${client.id}`,
    }
  }
  return { error: 'Choose a supported source type.' }
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
  if (referenceUrl && (referenceUrl.length > 500 ||
    (!/^https?:\/\//i.test(referenceUrl) && !/^\/crm\/clients\/[0-9a-f-]{36}$/i.test(referenceUrl)))) {
    return { error: 'Use a valid http or https link, or a client profile reference.' }
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
