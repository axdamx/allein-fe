/**
 * AI media generator card — image OR video.
 *
 * Images use ZAI CogView. The video card displays a coming soon state while
 * video generation is held for a later release.
 *
 * Plan-gated: image requires `aiImageGen`.
 * Locked tiers see an upgrade prompt instead of the form.
 */
import { useState } from 'react'
import {
  ImageIcon,
  Video,
  Loader2,
  Download,
  RefreshCw,
  Lock,
  Sparkles,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { usePlan } from '@/hooks/use-plan'
import { UpgradeModal } from '@/components/billing/upgrade-modal'
import {
  useGenerateImage,
  useGenerateVideo,
} from '@/hooks/use-media'
import { cn } from '@/lib/utils'
import { useStudioBrandKit } from '@/hooks/use-studio-brand'

type MediaType = 'image' | 'video'

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:3', label: 'Classic (4:3)' },
] as const

type AspectRatio = (typeof ASPECT_RATIOS)[number]['value']

export const MediaGenerator = ({
  mediaType,
  caption,
  onMediaGenerated,
  onMediaReset,
}: {
  mediaType: MediaType
  /** The generated caption — used to auto-derive the image prompt */
  caption: string
  /** Called with the saved asset when generation completes. */
  onMediaGenerated: (assetId: string, url: string, type: MediaType) => void
  onMediaReset?: () => void
}) => {
  const { hasFeature, tier, remaining, usage, config, canDo } = usePlan()
  const { data: brandKit } = useStudioBrandKit()
  const featureKey = mediaType === 'image' ? 'aiImageGen' : 'aiVideoGen'
  const hasAccess = hasFeature(featureKey)
  const atImageLimit = mediaType === 'image' && !canDo('imageGen')

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')

  // Image hook (one-shot).
  const imageGen = useGenerateImage()

  // Video hook (submit + auto-poll).
  const videoGen = useGenerateVideo()

  const Icon = mediaType === 'image' ? ImageIcon : Video
  const label = mediaType === 'image' ? 'Image' : 'Video'

  // Derive "ready" state from whichever hook is active.
  const imageReady =
    imageGen.data && 'id' in imageGen.data ? imageGen.data : null
  const readyUrl =
    mediaType === 'image'
      ? imageReady?.url ?? null
      : videoGen.state.status === 'ready'
        ? videoGen.state.asset?.url
        : null

  const isBusy =
    mediaType === 'image'
      ? imageGen.isPending
      : videoGen.state.status === 'submitting' ||
        videoGen.state.status === 'processing'

  const errorMsg =
    mediaType === 'image'
      ? imageGen.data && !('id' in imageGen.data)
        ? imageGen.data.error
        : null
      : videoGen.state.error

  // Auto-derive prompt from caption
  const derivePrompt = () => {
    if (!caption) return
    const brandDetails = [
      brandKit?.brandName && `Brand: ${brandKit.brandName}.`,
      brandKit?.colors.length && `Use these brand colors: ${brandKit.colors.join(', ')}.`,
    ].filter(Boolean).join(' ')
    const derived = `Visual content for social media post: "${caption.slice(0, 200)}". Professional, eye-catching, high quality. ${brandDetails}`.trim()
    setPrompt(derived)
  }

  const handleGenerate = async () => {
    if (mediaType === 'video') return
    if (!hasAccess) {
      setUpgradeOpen(true)
      return
    }
    if (atImageLimit) {
      setUpgradeOpen(true)
      return
    }
    if (!prompt.trim()) return

    if (mediaType === 'image') {
      const result = await imageGen.mutateAsync({ prompt, aspectRatio })
      if (result && 'id' in result && result.url) {
        onMediaGenerated(result.id, result.url, 'image')
      }
    } else {
      const result = await videoGen.submit({
        prompt,
        aspectRatio,
        durationSeconds: 5,
      })
      if (result && 'id' in result && result.status === 'ready' && result.url) {
        onMediaGenerated(result.id, result.url, 'video')
      }
    }
  }

  const handleRegenerate = () => {
    onMediaReset?.()
    if (mediaType === 'image') {
      imageGen.reset()
    } else {
      videoGen.reset()
    }
    handleGenerate()
  }

  if (mediaType === 'video') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Video className="size-5 text-muted-foreground" />
          </div>
          <p className="font-medium">Video generation</p>
          <Badge variant="secondary">Coming soon</Badge>
          <p className="text-sm text-muted-foreground">
            Video creation is in development. You can generate an image for this post now.
          </p>
        </CardContent>
      </Card>
    )
  }

  // --- Locked state (tier-gated) ---
  if (!hasAccess) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium capitalize">{label} generation</p>
            <p className="text-sm text-muted-foreground">
              {mediaType === 'image'
                ? 'Available on Pro plan and above.'
                : 'Available on Custom plan only.'}
            </p>
          </div>
          <Button size="sm" onClick={() => setUpgradeOpen(true)}>
            <Lock className="size-3.5" /> Upgrade to unlock
          </Button>
          <UpgradeModal
            open={upgradeOpen}
            onOpenChange={setUpgradeOpen}
            currentTier={tier}
            reason={{ kind: 'feature', feature: featureKey }}
          />
        </CardContent>
      </Card>
    )
  }

  const showForm = !readyUrl && !isBusy

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-primary" />
          {label} Generation
          <Badge variant="secondary" className="ml-auto text-xs">
            {mediaType === 'image' && remaining.imageGen !== null
              ? `${remaining.imageGen} images left this month`
              : 'AI'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Generate {mediaType === 'image' ? 'an image' : 'a short video'} to accompany your post
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Prompt input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="media-prompt" className="text-xs">
              Prompt
            </Label>
            <button
              onClick={derivePrompt}
              className="text-xs text-primary hover:underline"
            >
              <Sparkles className="mr-0.5 inline size-3" />
              Derive from caption
            </button>
          </div>
          <Textarea
            id="media-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the ${label} you want...`}
            rows={2}
            className="text-sm"
            disabled={isBusy}
          />
        </div>

        {/* Aspect ratio selector */}
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => setAspectRatio(ar.value)}
              disabled={isBusy}
              className={cn(
                'rounded-md border px-2 py-1 text-xs',
                aspectRatio === ar.value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'text-muted-foreground hover:border-foreground/30',
              )}
            >
              {ar.value}
            </button>
          ))}
        </div>

        {/* Generate button */}
        {showForm && (
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="w-full"
            size="sm"
          >
            <Icon className="size-4" />
            {atImageLimit ? 'Monthly image limit reached' : `Generate ${label}`}
          </Button>
        )}

        {atImageLimit && (
          <UpgradeModal
            open={upgradeOpen}
            onOpenChange={setUpgradeOpen}
            currentTier={tier}
            reason={{ kind: 'limit', metric: 'imageGen', used: usage.imageGen, max: config.limits.imageGen.max ?? 0 }}
          />
        )}

        {/* Generating state */}
        {isBusy && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Generating image…</span>
            </div>
          </div>
        )}

        {/* Ready state with preview */}
        {readyUrl && (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {mediaType === 'image' ? (
                <img
                  src={readyUrl}
                  alt="Generated content"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <video
                  src={readyUrl}
                  controls
                  className="aspect-square w-full object-cover"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRegenerate}
                disabled={isBusy}
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={readyUrl} download target="_blank" rel="noopener">
                  <Download className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {errorMsg && !isBusy && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
