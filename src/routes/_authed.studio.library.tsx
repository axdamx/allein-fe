import { useState } from 'react'
import {
  Trash2,
  Download,
  Loader2,
  ImageIcon,
  Video as VideoIcon,
  Filter,
  FolderPlus,
  Pencil,
} from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAssets, useDeleteAsset } from '@/hooks/use-media'
import type { MediaKind } from '@/server/media'
import { ImageUploadButton } from '@/components/studio/image-upload-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDeleteStudioAssetFolder, useMoveStudioAsset, useSaveStudioAssetFolder, useStudioAssetFolders } from '@/hooks/use-studio-library'

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
  const [folderFilter, setFolderFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [folderEditor, setFolderEditor] = useState<{ id?: string; name: string } | null>(null)
  const { data: assets, isLoading } = useAssets(
    filter === 'all' ? undefined : filter,
  )
  const deleteAsset = useDeleteAsset()
  const { data: folders, error: foldersError } = useStudioAssetFolders()
  const saveFolder = useSaveStudioAssetFolder()
  const deleteFolder = useDeleteStudioAssetFolder()
  const moveAsset = useMoveStudioAsset()
  const visibleAssets = (assets ?? []).filter((asset) =>
    (folderFilter === 'all' || (folderFilter === 'unfiled' ? !asset.collection_id : asset.collection_id === folderFilter)) &&
    (!search.trim() || asset.prompt.toLowerCase().includes(search.trim().toLowerCase())),
  )
  const selectedFolder = folders?.find((folder) => folder.id === folderFilter)

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
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {visibleAssets.length} item{visibleAssets.length === 1 ? '' : 's'}
          </span>
          <ImageUploadButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-black/[0.05] bg-white/40 p-3 dark:border-white/10 dark:bg-white/[0.025]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search assets" placeholder="Search assets…" className="min-w-40 flex-1" />
        <Select value={folderFilter} onValueChange={setFolderFilter}>
          <SelectTrigger className="w-44" aria-label="Filter folder"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All folders</SelectItem><SelectItem value="unfiled">Unfiled</SelectItem>{(folders ?? []).map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={() => setFolderEditor({ name: '' })}><FolderPlus className="size-4" /> New folder</Button>
        {selectedFolder && <>
          <Button type="button" size="sm" variant="ghost" onClick={() => setFolderEditor({ id: selectedFolder.id, name: selectedFolder.name })}><Pencil className="size-4" /> Rename</Button>
          <Button type="button" size="sm" variant="ghost" disabled={deleteFolder.isPending} onClick={async () => { const result = await deleteFolder.mutateAsync(selectedFolder.id); if (!result?.error) setFolderFilter('all') }}>Delete folder</Button>
        </>}
      </div>
      {foldersError && <p role="alert" className="text-sm text-destructive">Could not load folders. Apply migration 0031 before using this library.</p>}

      <Dialog open={folderEditor !== null} onOpenChange={(open) => { if (!open) setFolderEditor(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{folderEditor?.id ? 'Rename folder' : 'New folder'}</DialogTitle><DialogDescription>Folders group your Studio assets. Deleting a folder keeps its assets in the library.</DialogDescription></DialogHeader>
          <form onSubmit={async (event) => { event.preventDefault(); if (!folderEditor) return; const result = await saveFolder.mutateAsync(folderEditor); if (!('error' in result)) setFolderEditor(null) }} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="folder-name">Name</Label><Input id="folder-name" autoFocus required maxLength={80} value={folderEditor?.name ?? ''} onChange={(event) => setFolderEditor((current) => current ? { ...current, name: event.target.value } : null)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFolderEditor(null)}>Cancel</Button><Button type="submit" disabled={saveFolder.isPending || !folderEditor?.name.trim()}>{saveFolder.isPending ? 'Saving…' : 'Save folder'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : visibleAssets.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleAssets.map((asset) => {
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
                  <Select value={asset.collection_id ?? 'unfiled'} onValueChange={(value) => moveAsset.mutate({ assetId: asset.id, folderId: value === 'unfiled' ? null : value })}>
                    <SelectTrigger className="mt-2 h-8 w-full text-xs" aria-label={`Folder for ${asset.prompt}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="unfiled">Unfiled</SelectItem>{(folders ?? []).map((folder) => <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>)}</SelectContent>
                  </Select>
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
              {assets?.length ? 'No assets match these filters.' : 'Upload an image, generate one on the Create tab, or chat with the Studio agent.'}
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
