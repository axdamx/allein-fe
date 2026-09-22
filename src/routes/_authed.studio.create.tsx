import { useState } from 'react'
import {
  Copy,
  Loader2,
  Save,
  Sparkles,
  Wand2,
  Clock,
  Check,
} from 'lucide-react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

import { MediaGenerator } from '@/components/studio/media-generator'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useGeneratePost,
  useCreatePost,
} from '@/hooks/use-marketing'
import { usePlan } from '@/hooks/use-plan'
import { UsageIndicator } from '@/components/billing/usage-indicator'
import { PostImagePicker } from '@/components/studio/post-image-picker'
import { StudioSourcePicker, StudioSourceReview } from '@/components/studio/source-review'
import type { PostPlatform, GeneratedPost } from '@/hooks/use-marketing'
import { useStudioBrandKit, useStudioPostTemplates } from '@/hooks/use-studio-brand'
import { STARTER_POST_TEMPLATES } from '@/lib/studio-brand'
import type { StudioPostTemplate } from '@/lib/studio-brand'

/**
 * Studio → focused Create page.
 *
 * Enter from an approved source or from Planner; this is an action route,
 * rather than a permanent Studio navigation tab.
 */
const PLATFORMS: { value: PostPlatform; label: string; emoji: string }[] = [
  { value: 'instagram', label: 'Instagram', emoji: '📷' },
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { value: 'x', label: 'X (Twitter)', emoji: '🐦' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'telegram', label: 'Telegram', emoji: '✈️' },
  { value: 'email', label: 'Email', emoji: '✉️' },
]

const TONES = ['Brand voice', 'Professional', 'Casual', 'Funny', 'Inspirational', 'Bold']

type Step = 'form' | 'generating' | 'preview'

const StudioCreatePage = () => {
  const { sourceId } = Route.useSearch()
  const navigate = useNavigate()
  const { data: brandKit } = useStudioBrandKit()
  const { data: customTemplates } = useStudioPostTemplates()
  const generatePost = useGeneratePost()
  const createPost = useCreatePost()
  const { canDo } = usePlan()
  const atPostLimit = !canDo('posts')
  const initialPrompt = sourceId
    ? 'Create a social post using the selected approved source facts. Keep every specific claim accurate.'
    : ''

  const [step, setStep] = useState<Step>('form')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [platform, setPlatform] = useState<PostPlatform>('instagram')
  const [tone, setTone] = useState('Brand voice')
  const [generated, setGenerated] = useState<GeneratedPost | null>(null)
  const [sourceIds, setSourceIds] = useState<string[]>(sourceId ? [sourceId] : [])

  const selectTemplate = (templateId: string) => {
    const template: StudioPostTemplate | undefined = [...STARTER_POST_TEMPLATES, ...(customTemplates ?? [])]
      .find((item) => item.id === templateId)
    if (!template) return
    setPrompt(template.prompt)
    if (template.platform) setPlatform(template.platform)
    if (template.tone) setTone(template.tone)
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setStep('generating')
    try {
      const result = await generatePost.mutateAsync({ prompt, platform, tone, sourceIds })
      if (!('error' in result)) {
        setGenerated(result)
        setStep('preview')
      } else {
        setStep('form')
      }
    } catch {
      // The mutation displays the error toast.
      setStep('form')
    }
  }

  const handleReset = () => {
    setStep('form')
    setGenerated(null)
    setPrompt(initialPrompt)
    setSourceIds(sourceId ? [sourceId] : [])
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Create a post</h2>
          <p className="text-sm text-muted-foreground">{sourceId
            ? 'Opened from Sources. Review the selected facts, shape a channel draft, then save it to Planner.'
            : 'Start a new channel draft, review its facts and images, then save it to Planner.'}</p>
        </div>
        <Button asChild variant="outline"><Link to={sourceId ? '/studio/sources' : '/studio/planner'}>Back to {sourceId ? 'Sources' : 'Planner'}</Link></Button>
      </div>
      <UsageIndicator metric="posts" label="posts" windowSuffix="/day" />
        {step === 'form' && (
          <Card className="app-accent-card overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-[#171713] text-[#FFF9F1] dark:bg-[#F1663C] dark:text-[#171713]">
                  <Wand2 className="size-4" />
                </span>
                Create a campaign post
              </CardTitle>
              <CardDescription className="leading-5">
                Start with one idea. Save its first channel draft here, then add tailored versions in the Planner.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2"><Label>Start from a template</Label><Link to="/studio/brand" className="text-xs text-primary underline-offset-4 hover:underline">Manage brand kit and templates</Link></div>
                  <Select onValueChange={selectTemplate}>
                    <SelectTrigger><SelectValue placeholder="Choose a starter or saved template" /></SelectTrigger>
                    <SelectContent>
                      {[...STARTER_POST_TEMPLATES, ...(customTemplates ?? [])].map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {brandKit?.brandName && <p className="text-xs text-muted-foreground">Using {brandKit.brandName} brand guidance in new drafts.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prompt">What do you want to post?</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Announce our new AI-powered CRM feature with a special launch discount"
                    rows={5}
                    autoFocus
                  />
                </div>

                <StudioSourcePicker selectedIds={sourceIds} onChange={setSourceIds} />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={platform}
                      onValueChange={(v) => setPlatform(v as PostPlatform)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.emoji} {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[...new Set([...TONES, tone])].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!prompt.trim() || atPostLimit}
                >
                  <Sparkles className="size-4" />
                  Generate content
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'generating' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="font-medium">Generating content…</p>
              <p className="text-sm text-muted-foreground">
                Crafting the perfect {platform} post
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && generated && (
          <PostPreview
            generated={generated}
            platform={platform}
            onSave={async (draft) => {
              try {
                const result = await createPost.mutateAsync({
                  title: draft.title,
                  caption: draft.caption,
                  hashtags: draft.hashtags,
                  platform,
                  scheduledFor: draft.scheduledFor,
                  prompt,
                  mediaAssetIds: draft.mediaAssetIds,
                  sources: generated.sources,
                })
                if (!('error' in result)) await navigate({ to: '/studio/planner' })
              } catch {
                // The mutation displays the error toast.
              }
            }}
            onReset={handleReset}
            saving={createPost.isPending}
          />
        )}
    </div>
  )
}

export const Route = createFileRoute('/_authed/studio/create')({
  validateSearch: (search: Record<string, unknown>): { sourceId?: string } => {
    const sourceId = search.sourceId
    return typeof sourceId === 'string' && /^[0-9a-f-]{36}$/i.test(sourceId)
      ? { sourceId }
      : {}
  },
  component: StudioCreatePage,
})

// ---------------------------------------------------------------------------
// Post Preview (step 3 of state machine)
// ---------------------------------------------------------------------------

const PostPreview = ({
  generated,
  platform,
  onSave,
  onReset,
  saving,
}: {
  generated: GeneratedPost
  platform: PostPlatform
  onSave: (draft: Pick<GeneratedPost, 'title' | 'caption' | 'hashtags'> & { scheduledFor?: string; mediaAssetIds: string[] }) => void
  onReset: () => void
  saving: boolean
}) => {
  const [scheduleEnable, setScheduleEnable] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [copied, setCopied] = useState(false)
  const [draft, setDraft] = useState(generated)
  const [hashtagsText, setHashtagsText] = useState(generated.hashtags.join(', '))
  const [mediaAssetIds, setMediaAssetIds] = useState<string[]>([])
  const [generatedImages, setGeneratedImages] = useState<{ id: string; url: string; prompt: string }[]>([])
  const platformInfo = PLATFORMS.find((p) => p.value === platform)

  const handleCopy = () => {
    const text = `${draft.title}\n\n${draft.caption}\n\n${hashtagsText.split(/[\s,]+/).filter(Boolean).map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="app-accent-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>{platformInfo?.emoji}</span>
            Preview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Start over
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StudioSourceReview sources={generated.sources} />
        <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-white/45 p-4 dark:border-white/10 dark:bg-black/10">
          <p className="text-xs text-muted-foreground">Edit the AI draft before saving.</p>
          <div className="space-y-1.5">
            <Label htmlFor="post-title">Title</Label>
            <Input id="post-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="post-caption">Caption</Label>
            <Textarea id="post-caption" rows={5} value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="post-tags">Hashtags</Label>
            <Input id="post-tags" value={hashtagsText} onChange={(e) => setHashtagsText(e.target.value)} placeholder="property, malaysia" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="size-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" /> Copy
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3" />
            ENHANCE WITH MEDIA
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MediaGenerator
              mediaType="image"
              caption={draft.caption}
              onMediaGenerated={(assetId, url) => {
                setGeneratedImages((current) => [{ id: assetId, url, prompt: 'Generated post image' }, ...current])
                setMediaAssetIds((current) => current.includes(assetId) || current.length >= 10 ? current : [...current, assetId])
              }}
            />
            <MediaGenerator
              mediaType="video"
              caption={draft.caption}
              onMediaGenerated={() => {}}
            />
          </div>
          <PostImagePicker selectedIds={mediaAssetIds} onChange={setMediaAssetIds} extraImages={generatedImages} />
        </div>

        <div className="border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scheduleEnable}
              onChange={(e) => setScheduleEnable(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Clock className="size-3.5" />
            Add to content plan
          </label>
          {scheduleEnable && (
            <div className="mt-2 space-y-2">
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This saves a planned date. You will still need to publish the post yourself.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() =>
              onSave({
                title: draft.title.trim(),
                caption: draft.caption.trim(),
                hashtags: hashtagsText.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 15),
                scheduledFor: scheduleEnable && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
                mediaAssetIds,
              })
            }
            disabled={saving || !draft.title.trim() || !draft.caption.trim() || (scheduleEnable && !scheduledFor)}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {scheduleEnable ? 'Save to plan' : 'Save post'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
