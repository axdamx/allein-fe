import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { sanitizeSupabaseMessage } from '@/server/_errors'
import type { StudioContentIdea } from './studio-ideas'

async function ownerId() {
  const { data: { user } } = await getSupabaseServerClient().auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function listStudioContentIdeasImpl(): Promise<StudioContentIdea[]> {
  const id = await ownerId()
  const { data, error } = await getSupabaseServerClient().from('studio_content_ideas')
    .select('id, title, brief, created_at').eq('owner_id', id)
    .order('created_at', { ascending: false })
  if (error) throw new Error(sanitizeSupabaseMessage(error.message, 'Could not load content ideas.'))
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    brief: row.brief,
    createdAt: row.created_at,
  }))
}

export async function updateStudioContentIdeaImpl(input: { id: string; title: string; brief: string }): Promise<StudioContentIdea | { error: string }> {
  const id = await ownerId()
  if (typeof input.title !== 'string' || typeof input.brief !== 'string' ||
    !input.title.trim() || input.title.trim().length > 120 || input.brief.trim().length > 4000) {
    return { error: 'Enter an idea title under 120 characters and a brief under 4,000 characters.' }
  }
  const { data, error } = await getSupabaseServerClient().from('studio_content_ideas')
    .update({ title: input.title.trim(), brief: input.brief.trim() })
    .eq('id', input.id).eq('owner_id', id)
    .select('id, title, brief, created_at').single()
  if (error || !data) return { error: sanitizeSupabaseMessage(error?.message, 'Could not update content idea.') }
  return { id: data.id, title: data.title, brief: data.brief, createdAt: data.created_at }
}
