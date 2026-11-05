/**
 * AI media generator card — image OR video.
 *
 * Images use ZAI GLM-Image. The video card displays a coming soon state while
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
  useAssets,
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
  onMediaSelected,
  selectedAssetIds = [],
}: {
  mediaType: MediaType
  /** The generated caption — used to auto-derive the image prompt */
  caption: string
  /** Called with the saved asset when generation completes. */
  onMediaGenerated: (assetId: string, url: string, type: MediaType) => void
  /** Add a prior generated image to the current post. */
  onMediaSelected?: (assetId: string) => void
  selectedAssetIds?: string[]
}) => {
  const { hasFeature, tier, remaining, usage, config, canDo } = usePlan()
  const { data: brandKit } = useStudioBrandKit()
  const featureKey = mediaType === 'image' ? 'aiImageGen' : 'aiVideoGen'
  const hasAccess = hasFeature(featureKey)
  const atImageLimit = mediaType === 'image' && !canDo('imageGen')

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [sessionImages, setSessionImages] = useState<{ id: string; url: string; prompt: string }[]>([])
  const [focusedImageId, setFocusedImageId] = useState<string | null>(null)
  const [comparisonIds, setComparisonIds] = useState<string[]>([])

  // Image hook (one-shot).
  const imageGen = useGenerateImage()
  const { data: libraryImages } = useAssets('image')

  // Video hook (submit + auto-poll).
  const videoGen = useGenerateVideo()

  const Icon = mediaType === 'image' ? ImageIcon : Video
  const label = mediaType === 'image' ? 'Image' : 'Video'

  // Derive "ready" state from whichever hook is active.
  const seenImageIds = new Set<string>()
  const recentImages = [...sessionImages, ...(libraryImages ?? [])
    .filter((asset) => asset.provider === 'zai' && asset.status === 'ready' && asset.url)
    .map((asset) => ({ id: asset.id, url: asset.url!, prompt: asset.prompt }))]
    .filter((asset) => {
      if (seenImageIds.has(asset.id)) return false
      seenImageIds.add(asset.id)
      return true
    })
  const focusedImage = recentImages.find((asset) => asset.id === focusedImageId)
  const comparison = comparisonIds.map((id) => recentImages.find((asset) => asset.id === id)).filter((asset) => asset !== undefined)
  const readyUrl =
    mediaType === 'image'
      ? focusedImage?.url ?? null
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
      try {
        const result = await imageGen.mutateAsync({ prompt, aspectRatio })
        if (result && 'id' in result && result.url) {
          setSessionImages((current) => [{ id: result.id, url: result.url!, prompt }, ...current])
          setFocusedImageId(result.id)
          onMediaGenerated(result.id, result.url, 'image')
        }
      } catch {
        // The mutation displays the error toast; keep earlier images visible.
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

  const toggleComparison = (assetId: string) => {
    setComparisonIds((current) => current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [...current.slice(-1), assetId])
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

        <p className="text-xs text-muted-foreground">
          {remaining.imageGen === null
            ? 'Your app account has no image credit cap; Z.AI API charges still apply.'
            : `Each generation or regeneration uses 1 image credit. ${remaining.imageGen} of ${config.limits.imageGen.max} left this month.`}
          {' '}Discarded images still count. Failed generations with no saved image have their app credit returned.
        </p>

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
                  className="aspect-square w-full object-contain"
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
                onClick={handleGenerate}
                disabled={isBusy}
              >
                <RefreshCw className="size-3.5" />
                {atImageLimit ? 'Monthly limit reached' : 'Regenerate · 1 credit'}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={readyUrl} download target="_blank" rel="noopener">
                  <Download className="size-3.5" />
                </a>
              </Button>
            </div>
            {onMediaSelected && focusedImage && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() => onMediaSelected(focusedImage.id)}
                disabled={selectedAssetIds.includes(focusedImage.id) || selectedAssetIds.length >= 10}
              >
                {selectedAssetIds.includes(focusedImage.id) ? 'In post images' : 'Use this image in post'}
              </Button>
            )}
          </div>
        )}

        {recentImages.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">Generated images</p>
              <p className="text-[11px] text-muted-foreground">Select two to compare · saved in Library</p>
            </div>
            <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto" aria-label="Generated images">
              {recentImages.map((asset) => (
                <div key={asset.id} className="space-y-1">
                  <button
                    type="button"
                    aria-label={`Preview image: ${asset.prompt}`}
                    onClick={() => { setFocusedImageId(asset.id); setPrompt(asset.prompt) }}
                    className={cn('w-full overflow-hidden rounded-md border-2', focusedImageId === asset.id ? 'border-primary' : 'border-transparent hover:border-primary/50')}
                  >
                    <img src={asset.url} alt={asset.prompt} loading="lazy" className="aspect-square w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${comparisonIds.includes(asset.id) ? 'Remove from' : 'Add to'} comparison: ${asset.prompt}`}
                    onClick={() => toggleComparison(asset.id)}
                    className={cn('w-full rounded border px-1 py-0.5 text-[10px]', comparisonIds.includes(asset.id) ? 'border-primary text-primary' : 'text-muted-foreground')}
                  >
                    {comparisonIds.includes(asset.id) ? 'Comparing' : 'Compare'}
                  </button>
                </div>
              ))}
            </div>
            {comparison.length === 2 && (
              <div className="grid grid-cols-2 gap-2" aria-label="Side by side image comparison">
                {comparison.map((asset) => <div key={asset.id} className="overflow-hidden rounded-md border bg-muted"><img src={asset.url} alt={asset.prompt} className="aspect-square w-full object-contain" /><p className="truncate px-2 py-1 text-[10px] text-muted-foreground" title={asset.prompt}>{asset.prompt}</p></div>)}
              </div>
            )}
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
