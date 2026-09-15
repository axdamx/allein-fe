import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  Trash2,
  Film,
  ChevronLeft,
} from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { StoryboardScenes } from '@/components/studio/storyboard-scenes'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useStoryboards,
  useStoryboard,
  useDeleteStoryboard,
  useGenerateStoryboardFromBrief,
} from '@/hooks/use-storyboard'
import { cn } from '@/lib/utils'

/**
 * Studio → Storyboard tab.
 *
 * Two states:
 *  1. No storyboard selected → list + "generate from brief" form
 *  2. Storyboard selected → scene strip with drag-reorder + per-scene actions
 */
const StudioStoryboardPage = () => {
  const { data: storyboards, isLoading: sbLoading } = useStoryboards()
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: active, isLoading: activeLoading } = useStoryboard(activeId)

  if (activeId) {
    return (
      <StoryboardEditor
        storyboardId={activeId}
        onBack={() => setActiveId(null)}
        isLoading={activeLoading}
        title={active?.title ?? 'Loading…'}
        brief={active?.brief ?? null}
        scenes={active?.scenes ?? []}
      />
    )
  }

  return (
    <StoryboardListAndGenerator
      storyboards={storyboards ?? []}
      loading={sbLoading}
      onOpen={setActiveId}
    />
  )
}

// ---------------------------------------------------------------------------
// List + brief generator
// ---------------------------------------------------------------------------

const StoryboardListAndGenerator = ({
  storyboards,
  loading,
  onOpen,
}: {
  storyboards: import('@/hooks/use-storyboard').StoryboardRow[]
  loading: boolean
  onOpen: (id: string) => void
}) => {
  const [brief, setBrief] = useState('')
  const [sceneCount, setSceneCount] = useState(4)
  const generate = useGenerateStoryboardFromBrief()

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brief.trim()) return
    const result = await generate.mutateAsync({
      brief,
      sceneCount,
      aspectRatio: '16:9',
    })
    if (result && 'storyboardId' in result) {
      onOpen(result.storyboardId)
      setBrief('')
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* Existing storyboards */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E95F36]">Production board</p>
        <h2 className="mb-4 text-xl font-semibold tracking-[-0.03em]">Your storyboards</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : storyboards.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {storyboards.map((sb) => (
              <button
                key={sb.id}
                onClick={() => onOpen(sb.id)}
                className="group flex min-h-32 flex-col gap-2 rounded-[20px] border border-black/[0.06] bg-white/45 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#F1663C]/30 hover:bg-white/75 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.025] dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-[#F1663C]/10 text-[#E95F36]"><Film className="size-4" /></span>
                  <span className="font-medium">{sb.title}</span>
                </div>
                {sb.brief && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {sb.brief}
                  </p>
                )}
                <span className="mt-auto text-[10px] text-muted-foreground">
                  {new Date(sb.updated_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Film className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No storyboards yet</p>
                <p className="text-sm text-muted-foreground">
                  Generate one from a brief, or build it scene-by-scene.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Brief generator */}
      <Card className="app-accent-card h-fit lg:sticky lg:top-24">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-medium">Generate from brief</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe your video idea. The AI will draft a storyboard with
            scene-by-scene prompts you can refine and generate.
          </p>
          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="brief" className="text-xs">
                Brief
              </Label>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. 30-second promo for a new coffee blend — warm, cozy, morning routine"
                rows={4}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="count" className="text-xs">
                Number of scenes
              </Label>
              <Input
                id="count"
                type="number"
                min={2}
                max={8}
                value={sceneCount}
                onChange={(e) => setSceneCount(Number(e.target.value) || 4)}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!brief.trim() || generate.isPending}
            >
              {generate.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate storyboard
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

const StoryboardEditor = ({
  storyboardId,
  onBack,
  isLoading,
  title,
  brief,
  scenes,
}: {
  storyboardId: string
  onBack: () => void
  isLoading: boolean
  title: string
  brief: string | null
  scenes: import('@/hooks/use-storyboard').SceneRow[]
}) => {
  const deleteStoryboard = useDeleteStoryboard()

  const handleDelete = () => {
    if (!confirm('Delete this storyboard? This cannot be undone.')) return
    deleteStoryboard.mutate(storyboardId)
    onBack()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="size-4" />
          </Button>
          <div>
            <h2 className="flex items-center gap-2 font-medium">
              <Film className="size-4 text-muted-foreground" />
              {title}
            </h2>
            {brief && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {brief}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={deleteStoryboard.isPending}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>

      {/* Scene strip */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-64 shrink-0" />
          ))}
        </div>
      ) : (
        <StoryboardScenes scenes={scenes} storyboardId={storyboardId} />
      )}

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Tip: drag scenes by the handle to reorder. Click the pencil to edit the
        caption + generation prompt. Generate uses your image plan quota.
      </p>

      <p className="text-xs">
        <Link
          to="/studio/library"
          className={cn('text-primary hover:underline')}
        >
          Browse your asset library →
        </Link>
      </p>
    </div>
  )
}

export const Route = createFileRoute('/_authed/studio/storyboard')({
  component: StudioStoryboardPage,
})
