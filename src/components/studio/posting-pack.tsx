import { useState } from 'react'
import { format } from 'date-fns'
import { Check, Copy, Download, ExternalLink, Loader2, PackageOpen } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssets } from '@/hooks/use-media'
import type { PostRow } from '@/server/marketing'

const CHANNEL_NAMES: Record<PostRow['platform'], string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  email: 'Email',
}

function safeWebUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

function imageExtension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'jpg'
}

function filenameFor(post: PostRow, index: number, mimeType: string): string {
  const title = (post.title || 'post').normalize('NFKD')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post'
  return `${title}-${post.platform}-${String(index + 1).padStart(2, '0')}.${imageExtension(mimeType)}`
}

async function saveImage(url: string, post: PostRow, index: number): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Image download failed (${response.status})`)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('Image file is unavailable')
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filenameFor(post, index, blob.type)
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
}

function PostingPackContent({ post }: { post: PostRow }) {
  const { data: assets, isLoading } = useAssets('image')
  const [downloading, setDownloading] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const hashtags = post.hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')
  const caption = post.caption?.trim() ?? ''
  const fullText = [caption, hashtags].filter(Boolean).join('\n\n')
  const selectedIds = post.media_asset_ids ?? []
  const images = selectedIds.length > 0
    ? selectedIds.map((id) => ({ id, url: safeWebUrl(assets?.find((asset) => asset.id === id && asset.status === 'ready')?.url) }))
    : post.media_type === 'image' || post.media_type === 'carousel'
      ? [{ id: 'legacy', url: safeWebUrl(post.media_url) }]
      : []

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      toast.success(`${label} copied`)
      window.setTimeout(() => setCopied((current) => current === label ? null : current), 2000)
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`)
    }
  }

  const download = async (url: string, index: number) => {
    setDownloading(index)
    try {
      await saveImage(url, post, index)
    } catch {
      toast.error('Download failed. Open the image to save it manually.')
    } finally {
      setDownloading(null)
    }
  }

  return <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
    <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
      <div><p className="text-xs text-muted-foreground">Channel</p><p className="font-medium">{CHANNEL_NAMES[post.platform]}</p></div>
      <div><p className="text-xs text-muted-foreground">Planned date</p><p className="font-medium">{post.scheduled_for ? `${format(new Date(post.scheduled_for), 'PPp')} (local time)` : 'No date planned'}</p></div>
    </div>

    {post.platform === 'email' && post.title && <section className="space-y-2">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Subject</h3><Button type="button" size="sm" variant="outline" onClick={() => copy(post.title!, 'Subject')}>{copied === 'Subject' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy subject</Button></div>
      <p className="rounded-xl border p-3 text-sm">{post.title}</p>
    </section>}

    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Post text</h3><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={!caption} onClick={() => copy(caption, 'Caption')}>{copied === 'Caption' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Caption</Button><Button type="button" size="sm" disabled={!fullText} onClick={() => copy(fullText, 'Post text')}>{copied === 'Post text' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy post text</Button></div></div>
      <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border p-3 text-sm">{caption || 'No caption saved.'}{hashtags && <p className="mt-3 text-primary">{hashtags}</p>}</div>
      {hashtags && <Button type="button" size="sm" variant="ghost" onClick={() => copy(hashtags, 'Hashtags')}>{copied === 'Hashtags' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy hashtags only</Button>}
    </section>

    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Images in posting order</h3>
      {isLoading && selectedIds.length > 0 ? <Skeleton className="h-20 w-full" /> : images.length > 0 ? <div className="space-y-2">{images.map((image, index) => <div key={`${image.id}-${index}`} className="flex items-center gap-3 rounded-xl border p-2">
        {image.url ? <img src={image.url} alt={`Post image ${index + 1}`} className="size-16 shrink-0 rounded-lg object-cover" /> : <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">Missing</div>}
        <div className="min-w-0 flex-1"><p className="text-sm font-medium">{String(index + 1).padStart(2, '0')}{index === 0 ? ' · Cover' : ''}</p><p className="text-xs text-muted-foreground">{image.url ? 'Download and upload this image in this order.' : 'This image is unavailable in your Studio library.'}</p></div>
        {image.url && <div className="flex shrink-0 gap-1"><Button type="button" size="sm" variant="outline" disabled={downloading !== null} onClick={() => download(image.url!, index)}>{downloading === index ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Download</Button><Button size="icon" variant="ghost" asChild><a href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`Open image ${index + 1}`}><ExternalLink className="size-3.5" /></a></Button></div>}
      </div>)}</div> : <p className="text-sm text-muted-foreground">No images attached.</p>}
    </section>
    <p className="text-xs text-muted-foreground">This pack prepares the post for manual publishing. Studio does not send it to the social channel.</p>
  </div>
}

export function PostingPackButton({ post }: { post: PostRow }) {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" size="sm" variant="outline"><PackageOpen className="size-3.5" /> Posting pack</Button></DialogTrigger>
    <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
      <DialogHeader><DialogTitle>{post.title || 'Untitled post'}</DialogTitle><DialogDescription>Copy the text and download images in order for manual posting.</DialogDescription></DialogHeader>
      {open && <PostingPackContent post={post} />}
    </DialogContent>
  </Dialog>
}
