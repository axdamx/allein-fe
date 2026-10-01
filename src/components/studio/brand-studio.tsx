import { useState } from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploadButton } from '@/components/studio/image-upload-button'
import { useAssets } from '@/hooks/use-media'
import {
  useDeleteStudioPostTemplate,
  useSaveStudioBrandKit,
  useSaveStudioPostTemplate,
  useStudioBrandKit,
  useStudioPostTemplates,
} from '@/hooks/use-studio-brand'
import { STARTER_POST_TEMPLATES } from '@/lib/studio-brand'
import type { StudioBrandKit, StudioPostTemplate } from '@/lib/studio-brand'
import type { PostPlatform } from '@/server/marketing'
import type { SaveTemplateInput } from '@/server/studio-brand'

const CHANNELS: { value: PostPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
]

const EMPTY_TEMPLATE: SaveTemplateInput = {
  name: '', prompt: '', platform: null, tone: null,
}

function BrandKitForm({ initial }: { initial: StudioBrandKit }) {
  const [form, setForm] = useState(initial)
  const [colorsText, setColorsText] = useState(initial.colors.join(', '))
  const [hashtagsText, setHashtagsText] = useState(initial.defaultHashtags.map((tag) => `#${tag}`).join(' '))
  const [validation, setValidation] = useState('')
  const { data: assets } = useAssets('image')
  const save = useSaveStudioBrandKit()
  const readyImages = (assets ?? []).filter((asset) => asset.status === 'ready' && asset.url && asset.storage_path)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    const colors = colorsText.split(/[\s,]+/).map((color) => color.trim()).filter(Boolean)
    if (colors.length > 5 || colors.some((color) => !/^#[0-9a-fA-F]{6}$/.test(color))) {
      setValidation('Use up to five colors in #RRGGBB format, separated by commas.')
      return
    }
    const defaultHashtags = hashtagsText.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean)
    if (defaultHashtags.length > 15 || defaultHashtags.some((tag) => !/^[\p{L}\p{N}_]{1,50}$/u.test(tag))) {
      setValidation('Use up to 15 hashtags with letters, numbers, or underscores.')
      return
    }
    setValidation('')
    await save.mutateAsync({
      brandName: form.brandName,
      audience: form.audience,
      voice: form.voice,
      colors,
      logoAssetId: form.logoAssetId,
      defaultHashtags,
      disclaimer: form.disclaimer,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand kit</CardTitle>
        <CardDescription>Your voice and default hashtags guide new AI drafts. Colors and name also guide image prompts derived from a caption.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="brand-name">Brand name</Label><Input id="brand-name" maxLength={120} value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} placeholder="Your business or personal brand" /></div>
            <div className="space-y-2"><Label htmlFor="brand-colors">Brand colors</Label><Input id="brand-colors" value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="#F1663C, #171713" /><p className="text-xs text-muted-foreground">Up to five hex colors.</p></div>
          </div>
          <div className="space-y-2"><Label htmlFor="brand-audience">Audience</Label><Textarea id="brand-audience" maxLength={500} rows={2} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Who are your posts for?" /></div>
          <div className="space-y-2"><Label htmlFor="brand-voice">Voice and writing style</Label><Textarea id="brand-voice" maxLength={500} rows={3} value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })} placeholder="For example: warm, direct, practical, and never pushy" /></div>
          <div className="space-y-2"><Label htmlFor="brand-hashtags">Default hashtags</Label><Input id="brand-hashtags" value={hashtagsText} onChange={(e) => setHashtagsText(e.target.value)} placeholder="#YourBrand #LocalExpert" /><p className="text-xs text-muted-foreground">Added to social posts when there is room. WhatsApp and email omit hashtags.</p></div>
          <div className="space-y-2"><Label htmlFor="brand-disclaimer">Required guidance or disclaimer</Label><Textarea id="brand-disclaimer" maxLength={1000} rows={2} value={form.disclaimer} onChange={(e) => setForm({ ...form, disclaimer: e.target.value })} placeholder="Claims or wording the draft should include or avoid" /></div>
          <div className="space-y-2">
            <Label>Logo from Studio library</Label>
            <div className="flex flex-wrap items-center gap-3">
              {form.logoUrl && <img src={form.logoUrl} alt="Selected brand logo" className="size-14 rounded-xl border object-contain" />}
              <Select value={form.logoAssetId ?? 'none'} onValueChange={(value) => {
                const image = readyImages.find((asset) => asset.id === value)
                setForm({ ...form, logoAssetId: image?.id ?? null, logoUrl: image?.url ?? null })
              }}>
                <SelectTrigger className="max-w-64"><SelectValue placeholder="Choose an image" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No logo</SelectItem>
                  {readyImages.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.prompt.slice(0, 48)}</SelectItem>)}
                </SelectContent>
              </Select>
              <ImageUploadButton label="Upload logo" onUploaded={(asset) => setForm((current) => ({ ...current, logoAssetId: asset.id, logoUrl: asset.url }))} />
            </div>
            <p className="text-xs text-muted-foreground">The logo is saved for reference; image generation does not automatically place it in the image.</p>
          </div>
          {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
          <Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save brand kit</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function TemplateManager() {
  const { data: customTemplates, isLoading, error } = useStudioPostTemplates()
  const save = useSaveStudioPostTemplate()
  const remove = useDeleteStudioPostTemplate()
  const [editing, setEditing] = useState<SaveTemplateInput | null>(null)

  const startEdit = (template: StudioPostTemplate) => setEditing({
    id: template.builtIn ? undefined : template.id,
    name: template.name,
    prompt: template.prompt,
    platform: template.platform,
    tone: template.tone,
  })

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const result = await save.mutateAsync(editing)
    if (!('error' in result)) setEditing(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div><CardTitle>Post templates</CardTitle><CardDescription>Reuse a prompt, preferred channel, and tone in Create. Replace bracketed details before generating.</CardDescription></div>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing({ ...EMPTY_TEMPLATE })}><Plus className="size-4" /> New template</Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {editing && (
          <form className="space-y-3 rounded-xl border p-4" onSubmit={handleSave}>
            <div className="space-y-2"><Label htmlFor="template-name">Template name</Label><Input id="template-name" required maxLength={80} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="template-prompt">Prompt</Label><Textarea id="template-prompt" required maxLength={2000} rows={4} value={editing.prompt} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} placeholder="Describe the kind of post to create. Use [brackets] for facts to fill in." /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label>Default channel</Label><Select value={editing.platform ?? 'any'} onValueChange={(value) => setEditing({ ...editing, platform: value === 'any' ? null : value as PostPlatform })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Use current channel</SelectItem>{CHANNELS.map((channel) => <SelectItem key={channel.value} value={channel.value}>{channel.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="template-tone">Default tone</Label><Input id="template-tone" maxLength={80} value={editing.tone ?? ''} onChange={(e) => setEditing({ ...editing, tone: e.target.value || null })} placeholder="Brand voice" /></div>
            </div>
            <div className="flex gap-2"><Button type="submit" size="sm" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />} Save template</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
          </form>
        )}
        {error && <p role="alert" className="text-sm text-destructive">Could not load templates.</p>}
        {isLoading && <Skeleton className="h-24 w-full" />}
        <div className="grid gap-3 md:grid-cols-2">
          {[...STARTER_POST_TEMPLATES, ...(customTemplates ?? [])].map((template) => (
            <div key={template.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="font-medium">{template.name}</p><p className="text-xs text-muted-foreground">{template.builtIn ? 'Starter' : 'Your template'} · {template.platform ?? 'Any channel'}</p></div><div className="flex shrink-0 gap-1"><Button type="button" size="sm" variant="ghost" onClick={() => startEdit(template)}>{template.builtIn ? 'Customize' : 'Edit'}</Button>{!template.builtIn && <Button type="button" size="icon" variant="ghost" aria-label={`Delete ${template.name}`} disabled={remove.isPending} onClick={() => remove.mutate(template.id)}><Trash2 className="size-4" /></Button>}</div></div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{template.prompt}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function BrandStudio() {
  const { data: brandKit, isLoading, error } = useStudioBrandKit()
  return <div className="space-y-5">
    {isLoading && <Skeleton className="h-96 w-full" />}
    {error && <Card><CardContent className="text-sm text-destructive">Could not load your brand kit. Check that migration 0030 is applied.</CardContent></Card>}
    {brandKit && <BrandKitForm initial={brandKit} />}
    <TemplateManager />
  </div>
}
