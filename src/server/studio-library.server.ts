import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { sanitizeSupabaseMessage } from '@/server/_errors'
import type { StudioAssetFolder } from './studio-library'

async function ownerId() {
  const { data: { user } } = await getSupabaseServerClient().auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function listStudioAssetFoldersImpl(): Promise<StudioAssetFolder[]> {
  const id = await ownerId()
  const { data, error } = await getSupabaseServerClient().from('studio_asset_folders')
    .select('id, name').eq('owner_id', id).order('name')
  if (error) throw new Error(sanitizeSupabaseMessage(error.message, 'Could not load folders.'))
  return data ?? []
}

export async function saveStudioAssetFolderImpl(input: { id?: string; name: string }): Promise<StudioAssetFolder | { error: string }> {
  const id = await ownerId()
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80) {
    return { error: 'Folder name must be between 1 and 80 characters.' }
  }
  const supabase = getSupabaseServerClient()
  if (!input.id) {
    const { count } = await supabase.from('studio_asset_folders')
      .select('id', { count: 'exact', head: true }).eq('owner_id', id)
    if ((count ?? 0) >= 50) return { error: 'You can create up to 50 folders.' }
  }
  const query = input.id
    ? supabase.from('studio_asset_folders').update({ name: input.name.trim() }).eq('id', input.id).eq('owner_id', id)
    : supabase.from('studio_asset_folders').insert({ owner_id: id, name: input.name.trim() })
  const { data, error } = await query.select('id, name').single()
  if (error || !data) return { error: sanitizeSupabaseMessage(error?.message, 'Could not save folder.') }
  return data
}

export async function deleteStudioAssetFolderImpl(folderId: string): Promise<{ error: string } | null> {
  const id = await ownerId()
  const { data, error } = await getSupabaseServerClient().from('studio_asset_folders')
    .delete().eq('id', folderId).eq('owner_id', id).select('id')
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Could not delete folder.') }
  if (!data?.length) return { error: 'Folder not found.' }
  return null
}

export async function moveStudioAssetImpl(input: { assetId: string; folderId: string | null }): Promise<{ error: string } | null> {
  const id = await ownerId()
  const supabase = getSupabaseServerClient()
  if (input.folderId) {
    const { data: folder } = await supabase.from('studio_asset_folders')
      .select('id').eq('id', input.folderId).eq('owner_id', id).maybeSingle()
    if (!folder) return { error: 'Choose one of your folders.' }
  }
  const { data, error } = await supabase.from('studio_assets')
    .update({ collection_id: input.folderId }).eq('id', input.assetId).eq('owner_id', id).select('id')
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Could not move asset.') }
  if (!data?.length) return { error: 'Asset not found.' }
  return null
}
