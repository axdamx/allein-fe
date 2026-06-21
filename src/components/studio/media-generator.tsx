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
import { cn } from '@/lib/utils'

type MediaType = 'image' | 'video'
type GenState = 'idle' | 'generating' | 'ready' | 'error'

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)', dims: '1024×1024' },
  { value: '16:9', label: 'Landscape (16:9)', dims: '1792×1024' },
  { value: '9:16', label: 'Portrait (9:16)', dims: '1024×1792' },
  { value: '4:3', label: 'Classic (4:3)', dims: '1024×768' },
]

export function MediaGenerator({
  mediaType,
  caption,
  onMediaGenerated,
}: {
  mediaType: MediaType
  /** The generated caption — used to auto-derive the image prompt */
  caption: string
  /** Called with the media URL when generation completes */
  onMediaGenerated: (url: string, type: MediaType) => void
}) {
  const { hasFeature, tier } = usePlan()
  const featureKey = mediaType === 'image' ? 'aiImageGen' : 'aiVideoGen'
  const hasAccess = hasFeature(featureKey)

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [state, setState] = useState<GenState>('idle')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const Icon = mediaType === 'image' ? ImageIcon : Video
  const label = mediaType === 'image' ? 'Image' : 'Video'
  const estimatedTime = mediaType === 'image' ? '~10s' : '~2-5 min'

  // Auto-derive prompt from caption
  function derivePrompt() {
    if (!caption) return
    const derived = `Visual content for social media post: "${caption.slice(0, 200)}". Professional, eye-catching, high quality.`
    setPrompt(derived)
  }

  async function handleGenerate() {
    if (!hasAccess) {
      setUpgradeOpen(true)
      return
    }
    if (!prompt.trim()) return

    setState('generating')
    setProgress(0)
    setMediaUrl(null)

    // --- MOCK GENERATION ---
    // When API keys are available, replace this block with:
    //   Image: fetch('/api/generate-image', { body: { prompt, size } })
    //   Video: fetch('/api/generate-video', { body: { prompt } })
    //
    // For now, simulate the generation with a progress animation.

    const totalTime = mediaType === 'image' ? 3000 : 6000
    const interval = 100
    const steps = totalTime / interval

    for (let i = 0; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, interval))
      setProgress(Math.min(95, Math.round((i / steps) * 100)))
    }

    // Use a placeholder image so the UI shows something real
    // In production, this would be the URL returned by the image/video API
    const seed = Math.random().toString(36).slice(7)
    const placeholderUrl =
      mediaType === 'image'
        ? `https://picsum.photos/seed/${seed}/600/600`
        : `https://picsum.photos/seed/${seed}/600/600` // video would be a video URL

    setMediaUrl(placeholderUrl)
    setProgress(100)
    setState('ready')
    onMediaGenerated(placeholderUrl, mediaType)
  }

  function handleRegenerate() {
    setMediaUrl(null)
    setState('idle')
    setProgress(0)
    handleGenerate()
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-primary" />
          {label} Generation
          <Badge variant="secondary" className="ml-auto text-xs">
            AI
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
            disabled={state === 'generating'}
          />
        </div>

        {/* Aspect ratio selector */}
        <div className="flex gap-1.5">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => setAspectRatio(ar.value)}
              disabled={state === 'generating'}
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
        {state === 'idle' && (
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="w-full"
            size="sm"
          >
            <Icon className="size-4" />
            Generate {label}
          </Button>
        )}

        {/* Generating state with progress */}
        {state === 'generating' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>
                Generating {label}… {progress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {mediaType === 'image'
                ? 'Creating your image with AI'
                : 'Video generation takes longer (~2-5 min)'}
            </p>
          </div>
        )}

        {/* Ready state with preview */}
        {state === 'ready' && mediaUrl && (
          <div className="space-y-2">
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {mediaType === 'image' ? (
                <img
                  src={mediaUrl}
                  alt="Generated content"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="relative aspect-square">
                  <img
                    src={mediaUrl}
                    alt="Video thumbnail"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="flex size-12 items-center justify-center rounded-full bg-white/90">
                      <Video className="size-5 text-black" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleRegenerate}
              >
                <RefreshCw className="size-3.5" />
                Regenerate
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={mediaUrl} download target="_blank" rel="noopener">
                  <Download className="size-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Generation failed. Try again.</span>
          </div>
        )}

        {/* Disclaimer */}
        {state === 'idle' && (
          <p className="flex items-start gap-1 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <span>
              Demo mode — generates placeholder {label}s. Connect an API key
              (OpenAI gpt-image-1 for images, Kling for video) for real generation.
              Estimated time: {estimatedTime}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
