import { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Copy, List, Loader2, Pencil, Plus, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { UsageIndicator } from '@/components/billing/usage-indicator'
import { PostImagePicker } from '@/components/studio/post-image-picker'
import { StudioSourcePicker, StudioSourceReview } from '@/components/studio/source-review'
import { PostingPackButton } from '@/components/studio/posting-pack'
import { useCreatePost, useDuplicatePost, useGeneratePost, usePosts, useUpdatePost } from '@/hooks/use-marketing'
import { useStudioContentIdeas, useUpdateStudioContentIdea } from '@/hooks/use-studio-ideas'
import { usePlan } from '@/hooks/use-plan'
import type { GeneratedPost, PostPlatform, PostRow } from '@/server/marketing'
import type { StudioContentIdea } from '@/server/studio-ideas'
import { cn } from '@/lib/utils'

const PLATFORMS: { value: PostPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
]

type StatusFilter = 'all' | 'draft' | 'ready' | 'planned' | 'published' | 'failed'
type View = 'list' | 'calendar'

function visibleStatus(post: PostRow): StatusFilter {
  if (post.status === 'scheduled' || (post.status === 'ready' && post.scheduled_for)) return 'planned'
  if (post.status === 'draft' || post.status === 'published' || post.status === 'failed') return post.status
  return 'ready'
}

function PostSummary({
  post,
  onEdit,
  onDuplicate,
  duplicating,
}: {
  post: PostRow
  onEdit: () => void
  onDuplicate: () => void
  duplicating: boolean
}) {
  const status = visibleStatus(post)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        [post.caption, post.hashtags.map((tag) => `#${tag}`).join(' ')].filter(Boolean).join('\n\n'),
      )
      toast.success('Post copied')
    } catch {
      toast.error('Could not copy this post')
    }
  }

  return (
    <div className="flex gap-4 rounded-2xl border border-black/[0.06] bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.025]">
      {post.media_url && (post.media_type === 'image' || post.media_type === 'carousel') && (
        <div className="relative shrink-0"><img src={post.media_url} alt={post.title ?? 'Post image'} className="size-20 rounded-xl object-cover" />{post.media_type === 'carousel' && <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1 text-[10px] font-medium">{post.media_asset_ids?.length ?? 0} images</span>}</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{post.title || 'Untitled'}</h3>
          <Badge variant="secondary">{PLATFORMS.find((item) => item.value === post.platform)?.label ?? post.platform}</Badge>
          <Badge variant={status === 'failed' ? 'destructive' : 'outline'} className="capitalize">{status}</Badge>
        </div>
        <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{post.caption}</p>
        {!!post.metadata?.studio_sources?.length && <p className="mt-1 text-xs text-muted-foreground">Sources: {post.metadata.studio_sources.map((source) => source.title).join(', ')}</p>}
        {post.scheduled_for && (
          <p className="mt-2 text-xs text-muted-foreground">
            Planned for {format(new Date(post.scheduled_for), 'MMM d, yyyy · h:mm a')} · publish manually
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {(status === 'draft' || status === 'ready' || status === 'planned') && (
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="size-3.5" /> Edit</Button>
          )}
          <Button size="sm" variant="outline" onClick={onDuplicate} disabled={duplicating} title="Copy this post into a separate content idea">
            <Copy className="size-3.5" /> Duplicate post
          </Button>
          <Button size="sm" variant="ghost" onClick={copy}>Copy text</Button>
          <PostingPackButton post={post} />
        </div>
      </div>
    </div>
  )
}

function PostEditor({ post, onClose }: { post: PostRow; onClose: () => void }) {
  const update = useUpdatePost()
  const [title, setTitle] = useState(post.title ?? '')
  const [caption, setCaption] = useState(post.caption ?? '')
  const [hashtags, setHashtags] = useState(post.hashtags.join(', '))
  const [platform, setPlatform] = useState<PostPlatform>(post.platform)
  const [state, setState] = useState<'draft' | 'ready'>(post.status === 'draft' ? 'draft' : 'ready')
  const [planned, setPlanned] = useState(Boolean(post.scheduled_for))
  const initialPlannedFor = post.scheduled_for ? format(new Date(post.scheduled_for), "yyyy-MM-dd'T'HH:mm") : ''
  const [plannedFor, setPlannedFor] = useState(initialPlannedFor)
  const [mediaAssetIds, setMediaAssetIds] = useState<string[] | undefined>(undefined)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !caption.trim() || (planned && !plannedFor)) return
    try {
      const result = await update.mutateAsync({
        id: post.id,
        title,
        caption,
        hashtags: hashtags.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 15),
        platform,
        status: state,
        scheduledFor: planned
          ? plannedFor === initialPlannedFor ? undefined : new Date(plannedFor).toISOString()
          : post.scheduled_for ? null : undefined,
        mediaAssetIds,
      })
      if (!result?.error) {
        toast.success('Post updated')
        onClose()
      }
    } catch {
      // The mutation displays the error toast.
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit post</DialogTitle>
          <DialogDescription>Update the draft and planned date. Publishing remains manual.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="edit-title">Title</Label><Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} /></div>
          <div className="space-y-1.5"><Label htmlFor="edit-caption">Caption</Label><Textarea id="edit-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} required /></div>
          <div className="space-y-1.5"><Label htmlFor="edit-tags">Hashtags</Label><Input id="edit-tags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="property, investment, malaysia" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Channel</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as PostPlatform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>State</Label>
              <Select value={state} onValueChange={(value) => setState(value as 'draft' | 'ready')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Ready</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border p-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={planned} onChange={(e) => setPlanned(e.target.checked)} /> Add to content plan</label>
            {planned && <Input aria-label="Planned date and time" type="datetime-local" value={plannedFor} onChange={(e) => setPlannedFor(e.target.value)} required />}
            <p className="text-xs text-muted-foreground">Planned dates do not publish automatically.</p>
          </div>
          <PostImagePicker selectedIds={mediaAssetIds ?? post.media_asset_ids ?? []} onChange={setMediaAssetIds} legacyUrl={mediaAssetIds === undefined && !(post.media_asset_ids?.length) ? post.media_url : null} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={update.isPending || !title.trim() || !caption.trim() || (planned && !plannedFor)}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function IdeaEditor({ idea, onClose }: { idea: StudioContentIdea; onClose: () => void }) {
  const update = useUpdateStudioContentIdea()
  const [title, setTitle] = useState(idea.title)
  const [brief, setBrief] = useState(idea.brief)
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader><DialogTitle>Edit content idea</DialogTitle><DialogDescription>Keep the source facts and angle here. Channel versions have separate captions.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault()
        const result = await update.mutateAsync({ id: idea.id, title, brief })
        if (!('error' in result)) onClose()
      }}>
        <div className="space-y-2"><Label htmlFor="idea-title">Idea title</Label><Input id="idea-title" required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="idea-brief">Source brief</Label><Textarea id="idea-brief" rows={6} maxLength={4000} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Add verified details, audience, and intended message." /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={update.isPending || !title.trim()}>{update.isPending ? 'Saving…' : 'Save idea'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function VariantComposer({
  idea, source, usedPlatforms, onClose,
}: {
  idea: StudioContentIdea
  source: PostRow
  usedPlatforms: PostPlatform[]
  onClose: () => void
}) {
  const available = PLATFORMS.filter((channel) => !usedPlatforms.includes(channel.value))
  const [platform, setPlatform] = useState<PostPlatform>(available[0]?.value ?? 'instagram')
  const [tone, setTone] = useState('Brand voice')
  const [extraAngle, setExtraAngle] = useState('')
  const [sourceIds, setSourceIds] = useState<string[]>(source.metadata?.studio_sources?.map((item) => item.id) ?? [])
  const [draft, setDraft] = useState<GeneratedPost | null>(null)
  const [hashtags, setHashtags] = useState('')
  const [mediaAssetIds, setMediaAssetIds] = useState<string[]>(source.media_asset_ids ?? [])
  const generate = useGeneratePost()
  const create = useCreatePost()
  const { canDo } = usePlan()
  const prompt = [idea.brief.trim(), extraAngle.trim() && `Channel angle: ${extraAngle.trim()}`].filter(Boolean).join('\n\n')

  const handleGenerate = async () => {
    if (!prompt) return
    try {
      const result = await generate.mutateAsync({ prompt, platform, tone, sourceIds })
      if (!('error' in result)) {
        setDraft(result)
        setHashtags(result.hashtags.join(', '))
      }
    } catch {
      // The hook displays the error toast.
    }
  }
  const handleSave = async () => {
    if (!draft || !canDo('posts')) return
    try {
      const result = await create.mutateAsync({
        ideaId: idea.id,
        title: draft.title.trim(),
        caption: draft.caption.trim(),
        hashtags: hashtags.split(/[\s,]+/).map((tag) => tag.replace(/^#/, '').trim()).filter(Boolean).slice(0, 15),
        platform,
        prompt,
        mediaAssetIds,
        status: 'draft',
        sources: draft.sources,
      })
      if (!('error' in result)) onClose()
    } catch {
      // The hook displays the error toast.
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Add channel version</DialogTitle><DialogDescription>Generate a new caption from “{idea.title}”. Review and edit it before saving a draft. Publishing remains manual.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-3"><p className="text-xs font-medium">Source brief</p><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{idea.brief || 'Add a brief to this idea before generating a version.'}</p></div>
        <StudioSourcePicker selectedIds={sourceIds} onChange={(ids) => { setSourceIds(ids); setDraft(null) }} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2"><Label>Channel</Label><Select value={platform} onValueChange={(value) => { setPlatform(value as PostPlatform); setDraft(null) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{available.map((channel) => <SelectItem key={channel.value} value={channel.value}>{channel.label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="variant-tone">Tone</Label><Input id="variant-tone" maxLength={80} value={tone} onChange={(event) => { setTone(event.target.value); setDraft(null) }} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="variant-angle">Extra angle for this channel</Label><Textarea id="variant-angle" rows={2} maxLength={500} value={extraAngle} onChange={(event) => { setExtraAngle(event.target.value); setDraft(null) }} placeholder="Optional details or emphasis for this channel" /></div>
        <Button type="button" variant="outline" onClick={handleGenerate} disabled={!prompt || generate.isPending || available.length === 0}>{generate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generate version</Button>
        {draft && <div className="space-y-3 border-t pt-4">
          <StudioSourceReview sources={draft.sources} />
          <div className="space-y-2"><Label htmlFor="variant-title">Title</Label><Input id="variant-title" maxLength={100} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="variant-caption">Caption</Label><Textarea id="variant-caption" rows={6} value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="variant-hashtags">Hashtags</Label><Input id="variant-hashtags" value={hashtags} onChange={(event) => setHashtags(event.target.value)} /></div>
          <PostImagePicker selectedIds={mediaAssetIds} onChange={setMediaAssetIds} />
          <p className="text-xs text-muted-foreground">Images start from the source version. You can change or reorder them for this channel.</p>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="button" onClick={handleSave} disabled={create.isPending || !canDo('posts') || !draft.title.trim() || !draft.caption.trim()}>{create.isPending ? 'Saving…' : 'Save channel draft'}</Button></DialogFooter>
        </div>}
      </div>
    </DialogContent>
  </Dialog>
}

export function ContentPlanner() {
  const { data: posts, isLoading } = usePosts()
  const { data: ideas, error: ideasError } = useStudioContentIdeas()
  const duplicate = useDuplicatePost()
  const [platform, setPlatform] = useState<PostPlatform | 'all'>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('list')
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [day, setDay] = useState<Date | null>(null)
  const [editing, setEditing] = useState<PostRow | null>(null)
  const [editingIdea, setEditingIdea] = useState<StudioContentIdea | null>(null)
  const [variant, setVariant] = useState<{ idea: StudioContentIdea; source: PostRow; usedPlatforms: PostPlatform[] } | null>(null)

  const ideaMap = new Map((ideas ?? []).map((idea) => [idea.id, idea]))

  const filtered = (posts ?? []).filter((post) => {
    if (platform !== 'all' && post.platform !== platform) return false
    if (status !== 'all' && visibleStatus(post) !== status) return false
    const idea = ideaMap.get(post.idea_id)
    if (query.trim() && !`${post.title ?? ''} ${post.caption ?? ''} ${idea?.title ?? ''} ${idea?.brief ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())) return false
    const postDay = format(new Date(post.scheduled_for ?? post.created_at), 'yyyy-MM-dd')
    return (!from || postDay >= from) && (!to || postDay <= to)
  })
  const plannedPosts = filtered.filter((post) => post.scheduled_for && ['draft', 'ready', 'scheduled'].includes(post.status))
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
  const dayPosts = day ? plannedPosts.filter((post) => isSameDay(new Date(post.scheduled_for!), day)) : []
  const grouped = new Map<string, PostRow[]>()
  for (const post of filtered) {
    const id = post.idea_id || post.id
    grouped.set(id, [...(grouped.get(id) ?? []), post])
  }

  const renderPost = (post: PostRow) => (
    <PostSummary
      key={post.id}
      post={post}
      onEdit={() => setEditing(post)}
      onDuplicate={() => duplicate.mutate(post.id)}
      duplicating={duplicate.isPending && duplicate.variables === post.id}
    />
  )

  return (
    <div className="space-y-5">
      <UsageIndicator metric="posts" label="posts" windowSuffix="/day" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Content planner</h2><p className="text-sm text-muted-foreground">Keep channel drafts together under one idea, plan dates, and copy content when you are ready to post.</p></div>
        <Button asChild><Link to="/studio"><Plus className="size-4" /> Create post</Link></Button>
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-[1fr_150px_150px_145px_145px]">
          <Input aria-label="Search posts" placeholder="Search content…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select value={platform} onValueChange={(value) => setPlatform(value as PostPlatform | 'all')}>
            <SelectTrigger aria-label="Filter channel"><SelectValue placeholder="All channels" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All channels</SelectItem>{PLATFORMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger aria-label="Filter status"><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent>{(['all', 'draft', 'ready', 'planned', 'published', 'failed'] as const).map((item) => <SelectItem key={item} value={item} className="capitalize">{item === 'all' ? 'All states' : item}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
        </CardContent>
      </Card>
      {ideasError && <p role="alert" className="text-sm text-destructive">Could not load content ideas. Apply migration 0032 before using channel versions.</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{filtered.length} post{filtered.length === 1 ? '' : 's'} found</p>
        <div className="flex gap-1 rounded-xl border p-1">
          <Button size="sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')}><List className="size-4" /> List</Button>
          <Button size="sm" variant={view === 'calendar' ? 'secondary' : 'ghost'} onClick={() => setView('calendar')}><CalendarDays className="size-4" /> Calendar</Button>
        </div>
      </div>
      {isLoading ? <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)}</div>
        : view === 'list' ? (
          filtered.length > 0 ? <div className="space-y-4">{[...grouped.entries()].map(([id, versions]) => {
            const allVersions = (posts ?? []).filter((post) => (post.idea_id || post.id) === id)
            const source = allVersions[allVersions.length - 1] ?? versions[0]
            const idea = ideaMap.get(id) ?? { id, title: source.title || 'Untitled idea', brief: source.prompt || source.caption || '', createdAt: source.created_at }
            const usedPlatforms = allVersions.map((post) => post.platform)
            return <Card key={id} className="gap-0 overflow-hidden py-0">
              <CardHeader className="border-b bg-muted/20 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><CardTitle className="text-base">{idea.title}</CardTitle><p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{idea.brief || 'No brief yet. Add verified facts before creating another channel version.'}</p><p className="mt-1 text-xs text-muted-foreground">{allVersions.length} channel version{allVersions.length === 1 ? '' : 's'}</p></div>
                  <div className="flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditingIdea(idea)}><Pencil className="size-3.5" /> Edit idea</Button><Button type="button" size="sm" variant="outline" disabled={usedPlatforms.length >= PLATFORMS.length} onClick={() => setVariant({ idea, source, usedPlatforms })}><Plus className="size-3.5" /> Add channel version</Button></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 py-3">{versions.map(renderPost)}</CardContent>
            </Card>
          })}</div>
            : <p className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">No posts match these filters.</p>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>{format(month, 'MMMM yyyy')}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Planned posts only · publishing is manual</p></div>
              <div className="flex gap-1"><Button size="icon" variant="outline" aria-label="Previous month" onClick={() => { setMonth(addMonths(month, -1)); setDay(null) }}><ChevronLeft className="size-4" /></Button><Button size="icon" variant="outline" aria-label="Next month" onClick={() => { setMonth(addMonths(month, 1)); setDay(null) }}><ChevronRight className="size-4" /></Button></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => <span key={name} className="py-2">{name}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((date) => {
                  const count = plannedPosts.filter((post) => isSameDay(new Date(post.scheduled_for!), date)).length
                  return <button key={date.toISOString()} type="button" onClick={() => setDay(date)} className={cn('min-h-16 rounded-xl border p-2 text-left text-sm transition-colors hover:border-primary sm:min-h-24', !isSameMonth(date, month) && 'opacity-40', day && isSameDay(date, day) && 'border-primary bg-primary/5')}>
                    <span className="font-medium">{format(date, 'd')}</span>
                    {count > 0 && <span className="mt-1 block rounded-md bg-[#F1663C]/10 px-1 py-0.5 text-[10px] text-[#C95735]">{count} planned</span>}
                  </button>
                })}
              </div>
              <div className="border-t pt-4">
                <h3 className="mb-3 text-sm font-semibold">{day ? format(day, 'EEEE, MMMM d') : 'Select a day to see planned posts'}</h3>
                {day && (dayPosts.length > 0 ? <div className="space-y-3">{dayPosts.map(renderPost)}</div> : <p className="text-sm text-muted-foreground">Nothing planned for this day.</p>)}
              </div>
            </CardContent>
          </Card>
        )}
      {editing && <PostEditor key={editing.id} post={editing} onClose={() => setEditing(null)} />}
      {editingIdea && <IdeaEditor key={editingIdea.id} idea={editingIdea} onClose={() => setEditingIdea(null)} />}
      {variant && <VariantComposer key={variant.idea.id} {...variant} onClose={() => setVariant(null)} />}
    </div>
  )
}
