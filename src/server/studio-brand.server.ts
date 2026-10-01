import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { EMPTY_BRAND_KIT } from '@/lib/studio-brand'
import type { StudioBrandKit, StudioPostTemplate } from '@/lib/studio-brand'
import type { PostPlatform } from '@/server/marketing'
import type { SaveBrandKitInput, SaveTemplateInput } from './studio-brand'
import { sanitizeSupabaseMessage } from '@/server/_errors'

const PLATFORMS = new Set<PostPlatform>([
  'instagram', 'facebook', 'linkedin', 'x', 'tiktok', 'whatsapp', 'telegram', 'email',
])

function normalizeHashtags(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const tag = value.replace(/^#/, '').trim()
    if (!/^[\p{L}\p{N}_]{1,50}$/u.test(tag)) continue
    if (seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    result.push(tag)
    if (result.length === 15) break
  }
  return result
}

async function currentUserId(): Promise<string> {
  const { data: { user } } = await getSupabaseServerClient().auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function getStudioBrandKitImpl(): Promise<StudioBrandKit> {
  const ownerId = await currentUserId()
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from('studio_brand_kits')
    .select('brand_name, audience, voice, colors, logo_asset_id, default_hashtags, disclaimer')
    .eq('owner_id', ownerId).maybeSingle()
  if (error) throw new Error(sanitizeSupabaseMessage(error.message, 'Could not load brand kit.'))
  if (!data) return { ...EMPTY_BRAND_KIT }

  let logoUrl: string | null = null
  if (data.logo_asset_id) {
    const { data: logo } = await supabase.from('studio_assets')
      .select('url').eq('id', data.logo_asset_id).eq('owner_id', ownerId)
      .eq('kind', 'image').eq('status', 'ready').maybeSingle()
    logoUrl = logo?.url ?? null
  }
  return {
    brandName: data.brand_name ?? '',
    audience: data.audience ?? '',
    voice: data.voice ?? '',
    colors: data.colors ?? [],
    logoAssetId: data.logo_asset_id ?? null,
    logoUrl,
    defaultHashtags: data.default_hashtags ?? [],
    disclaimer: data.disclaimer ?? '',
  }
}

export async function saveStudioBrandKitImpl(input: SaveBrandKitInput): Promise<StudioBrandKit | { error: string }> {
  const ownerId = await currentUserId()
  const supabase = getSupabaseServerClient()
  if ([input.brandName, input.audience, input.voice, input.disclaimer].some((value) => typeof value !== 'string')) {
    return { error: 'Enter valid brand kit text.' }
  }
  const brandName = input.brandName.trim()
  const audience = input.audience.trim()
  const voice = input.voice.trim()
  const disclaimer = input.disclaimer.trim()
  if (brandName.length > 120 || audience.length > 500 || voice.length > 500 || disclaimer.length > 1000) {
    return { error: 'Brand kit text is too long.' }
  }
  if (!Array.isArray(input.colors) || input.colors.length > 5 || input.colors.some((color) => typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color))) {
    return { error: 'Use up to five colors in #RRGGBB format.' }
  }
  if (!Array.isArray(input.defaultHashtags) || input.defaultHashtags.length > 15 || input.defaultHashtags.some((tag) => typeof tag !== 'string')) {
    return { error: 'Use up to 15 default hashtags.' }
  }
  if (input.logoAssetId) {
    const { data: logo } = await supabase.from('studio_assets')
      .select('id').eq('id', input.logoAssetId).eq('owner_id', ownerId)
      .eq('kind', 'image').eq('status', 'ready').not('storage_path', 'is', null).maybeSingle()
    if (!logo) return { error: 'Choose a saved image from your Studio library for the logo.' }
  }

  const { error } = await supabase.from('studio_brand_kits').upsert({
    owner_id: ownerId,
    brand_name: brandName,
    audience,
    voice,
    colors: [...new Set(input.colors.map((color) => color.toUpperCase()))],
    logo_asset_id: input.logoAssetId ?? null,
    default_hashtags: normalizeHashtags(input.defaultHashtags),
    disclaimer,
  }, { onConflict: 'owner_id' })
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Could not save brand kit.') }
  return getStudioBrandKitImpl()
}

export async function listStudioPostTemplatesImpl(): Promise<StudioPostTemplate[]> {
  const ownerId = await currentUserId()
  const { data, error } = await getSupabaseServerClient().from('studio_post_templates')
    .select('id, name, prompt, platform, tone').eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(sanitizeSupabaseMessage(error.message, 'Could not load templates.'))
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    prompt: row.prompt,
    platform: row.platform as PostPlatform | null,
    tone: row.tone,
  }))
}

export async function saveStudioPostTemplateImpl(input: SaveTemplateInput): Promise<StudioPostTemplate | { error: string }> {
  const ownerId = await currentUserId()
  const supabase = getSupabaseServerClient()
  if (typeof input.name !== 'string' || typeof input.prompt !== 'string' || (input.tone != null && typeof input.tone !== 'string')) {
    return { error: 'Enter a valid template name and prompt.' }
  }
  const name = input.name.trim()
  const prompt = input.prompt.trim()
  const tone = input.tone?.trim() || null
  if (!name || name.length > 80 || !prompt || prompt.length > 2000 || (tone?.length ?? 0) > 80) {
    return { error: 'Enter a template name and prompt within the size limits.' }
  }
  if (input.platform && !PLATFORMS.has(input.platform)) return { error: 'Choose a valid channel.' }

  if (!input.id) {
    const { count, error: countError } = await supabase.from('studio_post_templates')
      .select('id', { count: 'exact', head: true }).eq('owner_id', ownerId)
    if (countError) return { error: 'Could not check the template limit.' }
    if ((count ?? 0) >= 50) return { error: 'You can save up to 50 templates.' }
  }

  const values = { name, prompt, platform: input.platform ?? null, tone }
  const query = input.id
    ? supabase.from('studio_post_templates').update(values).eq('id', input.id).eq('owner_id', ownerId)
    : supabase.from('studio_post_templates').insert({ ...values, owner_id: ownerId })
  const { data, error } = await query.select('id, name, prompt, platform, tone').single()
  if (error || !data) return { error: sanitizeSupabaseMessage(error?.message, 'Could not save template.') }
  return {
    id: data.id,
    name: data.name,
    prompt: data.prompt,
    platform: data.platform as PostPlatform | null,
    tone: data.tone,
  }
}

export async function deleteStudioPostTemplateImpl(id: string): Promise<{ error: string } | null> {
  const ownerId = await currentUserId()
  const { data, error } = await getSupabaseServerClient().from('studio_post_templates')
    .delete().eq('id', id).eq('owner_id', ownerId).select('id')
  if (error) return { error: sanitizeSupabaseMessage(error.message, 'Could not delete template.') }
  if (!data?.length) return { error: 'Template not found.' }
  return null
}
