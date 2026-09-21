import { useState } from 'react'
import {
  Trash2,
  Download,
  Loader2,
  ImageIcon,
  Video as VideoIcon,
  Filter,
} from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAssets, useDeleteAsset } from '@/hooks/use-media'
import type { MediaKind } from '@/server/media'

type FilterKind = 'all' | MediaKind

const FILTERS: { value: FilterKind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
]

/**
 * Studio → Library tab.
 *
 * Grid of every generated asset (image + video) tracked in `studio_assets`.
 * Filter by kind, click to view full-size, delete or download. Pending video
 * jobs show a "processing" badge so users can tell at a glance what's still
 * cooking.
 */
const StudioLibraryPage = () => {
  const [filter, setFilter] = useState<FilterKind>('all')
  const { data: assets, isLoading } = useAssets(
    filter === 'all' ? undefined : filter,
  )
  const deleteAsset = useDeleteAsset()

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-black/[0.05] bg-white/40 p-2 dark:border-white/10 dark:bg-white/[0.025]">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="size-4 text-muted-foreground" />
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                filter === f.value
                  ? 'border-[#171713] bg-[#171713] text-[#FFF9F1] shadow-sm dark:border-[#F1663C] dark:bg-[#F1663C] dark:text-[#171713]'
                  : 'text-muted-foreground hover:border-foreground/30',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {assets?.length ?? 0} item{(assets?.length ?? 0) === 1 ? '' : 's'}
        </span>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : assets && assets.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const isVideo = asset.kind === 'video'
            const isReady = asset.status === 'ready' && asset.url
            return (
              <Card key={asset.id} className="app-interactive-card group gap-0 overflow-hidden py-0">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {isReady ? (
                    isVideo ? (
                      <video
                        src={asset.url!}
                        controls
                        className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <img
                        src={asset.url!}
                        alt={asset.prompt}
                        className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    )
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                      {asset.status === 'processing' ? (
                        <>
                          <Loader2 className="size-6 animate-spin" />
                          <span className="text-[11px]">Generating…</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="size-6 opacity-40" />
                          <span className="text-[11px] capitalize">
                            {asset.status}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Kind badge */}
                  <Badge
                    variant="secondary"
                    className="absolute left-2 top-2 gap-1 bg-background/80 text-[10px] backdrop-blur"
                  >
                    {isVideo ? (
                      <VideoIcon className="size-2.5" />
                    ) : (
                      <ImageIcon className="size-2.5" />
                    )}
                    <span className="capitalize">{asset.kind}</span>
                  </Badge>

                  {/* Hover actions — delete available for any status,
                      download only when there's something to download. */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {isReady && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-7 bg-background/80 backdrop-blur"
                        asChild
                      >
                        <a
                          href={asset.url!}
                          download
                          target="_blank"
                          rel="noopener"
                        >
                          <Download className="size-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="size-7 bg-background/80 text-destructive backdrop-blur hover:text-destructive"
                      onClick={() => deleteAsset.mutate(asset.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-2.5">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {asset.prompt}
                  </p>
                  {asset.status === 'failed' && asset.error && (
                    <p
                      className="mt-1 line-clamp-2 text-[10px] text-destructive"
                      title={asset.error}
                    >
                      {asset.error}
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[#F1663C]/10 text-[#E95F36]">
            <ImageIcon className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No media yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Generate images from the Create tab or by chatting with
              the Studio agent.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/_authed/studio/library')({
  component: StudioLibraryPage,
})
