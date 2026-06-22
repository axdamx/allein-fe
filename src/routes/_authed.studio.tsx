import { useState } from 'react'
import {
  Calendar,
  Copy,
  Hash,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  Clock,
  Check,
} from 'lucide-react'
import { format } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FeatureGate } from '@/components/billing/feature-gate'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  usePosts,
  useGeneratePost,
  useCreatePost,
  useDeletePost,
} from '@/hooks/use-marketing'
import type { PostPlatform, GeneratedPost } from '@/hooks/use-marketing'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/studio')({
  component: StudioPage,
})

const PLATFORMS: { value: PostPlatform; label: string; emoji: string }[] = [
  { value: 'instagram', label: 'Instagram', emoji: '📷' },
  { value: 'facebook', label: 'Facebook', emoji: '📘' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { value: 'x', label: 'X (Twitter)', emoji: '🐦' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'email', label: 'Email', emoji: '✉️' },
]

const TONES = ['Professional', 'Casual', 'Funny', 'Inspirational', 'Bold']

type Step = 'form' | 'generating' | 'preview'

function StudioPage() {
  const { user } = Route.useRouteContext()
  const { data: posts, isLoading } = usePosts()
  const generatePost = useGeneratePost()
  const createPost = useCreatePost()

  // State machine: form → generating → preview
  const [step, setStep] = useState<Step>('form')
  const [prompt, setPrompt] = useState('')
  const [platform, setPlatform] = useState<PostPlatform>('instagram')
  const [tone, setTone] = useState('Professional')
  const [generated, setGenerated] = useState<GeneratedPost | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    setStep('generating')
    const result = await generatePost.mutateAsync({
      prompt,
      platform,
      tone,
    })
    if (!('error' in result)) {
      setGenerated(result)
      setStep('preview')
    } else {
      setStep('form')
    }
  }

  function handleReset() {
    setStep('form')
    setGenerated(null)
    setPrompt('')
  }

  return (
    <FeatureGate feature="marketingStudio">
      <DashboardShell
        userEmail={user?.email}
        userName={user?.email?.split('@')[0]}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Marketing Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate, schedule, and manage your social media content with AI.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Generator / Preview */}
          <div>
            {step === 'form' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wand2 className="size-4 text-primary" />
                    Content Generator
                  </CardTitle>
                  <CardDescription>
                    Describe what you want to post about.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="prompt">What do you want to post?</Label>
                      <Textarea
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. Announce our new AI-powered CRM feature with a special launch discount"
                        rows={3}
                        autoFocus
                      />
                    </div>

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
                            {TONES.map((t) => (
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
                      disabled={!prompt.trim()}
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
                onSave={async (scheduledFor) => {
                  const result = await createPost.mutateAsync({
                    title: generated.title,
                    caption: generated.caption,
                    hashtags: generated.hashtags,
                    platform,
                    scheduledFor,
                    prompt,
                  })
                  if (!('error' in result)) {
                    handleReset()
                  }
                }}
                onReset={handleReset}
                saving={createPost.isPending}
              />
            )}
          </div>

          {/* Right: Recent posts */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="size-4" />
                  Your Content
                </CardTitle>
                <CardDescription>
                  {posts?.length ?? 0} post{(posts?.length ?? 0) === 1 ? '' : 's'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : posts && posts.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No posts yet. Generate your first piece of content!
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardShell>
    </FeatureGate>
  )
}

// ---------------------------------------------------------------------------
// Post Preview (step 3 of state machine)
// ---------------------------------------------------------------------------

function PostPreview({
  generated,
  platform,
  onSave,
  onReset,
  saving,
}: {
  generated: GeneratedPost
  platform: PostPlatform
  onSave: (scheduledFor?: string) => void
  onReset: () => void
  saving: boolean
}) {
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [copied, setCopied] = useState(false)
  const platformInfo = PLATFORMS.find((p) => p.value === platform)

  function handleCopy() {
    const text = `${generated.title}\n\n${generated.caption}\n\n${generated.hashtags.map((h) => `#${h}`).join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-primary/20">
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
        {/* Generated content */}
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Title</p>
            <p className="font-semibold">{generated.title}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Caption</p>
            <p className="whitespace-pre-wrap text-sm">{generated.caption}</p>
          </div>
          {generated.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {generated.hashtags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Hash className="mr-0.5 size-2.5" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
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

        {/* Media generation */}
        <div className="space-y-3 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3" />
            ENHANCE WITH MEDIA
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MediaGenerator
              mediaType="image"
              caption={generated.caption}
              onMediaGenerated={() => {}}
            />
            <MediaGenerator
              mediaType="video"
              caption={generated.caption}
              onMediaGenerated={() => {}}
            />
          </div>
        </div>

        {/* Scheduling */}
        <div className="border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Clock className="size-3.5" />
            Schedule for later
          </label>
          {scheduleEnabled && (
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() =>
              onSave(scheduleEnabled && scheduledFor ? new Date(scheduledFor).toISOString() : undefined)
            }
            disabled={saving || (scheduleEnabled && !scheduledFor)}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {scheduleEnabled ? 'Schedule post' : 'Save post'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Post Card (in the list)
// ---------------------------------------------------------------------------

function PostCard({ post }: { post: import('@/server/marketing').PostRow }) {
  const deletePost = useDeletePost()
  const platformInfo = PLATFORMS.find((p) => p.value === post.platform)

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    ready: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    scheduled: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    published: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span>{platformInfo?.emoji}</span>
            <p className="truncate text-sm font-medium">
              {post.title || 'Untitled'}
            </p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {post.caption}
          </p>
          {post.hashtags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {post.hashtags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-primary">
                  #{tag}
                </span>
              ))}
              {post.hashtags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{post.hashtags.length - 3}
                </span>
              )}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                statusColors[post.status] ?? statusColors.draft,
              )}
            >
              {post.status}
            </span>
            {post.scheduled_for && (
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(post.scheduled_for), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => deletePost.mutate(post.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
