import { useState } from 'react'
import { ArrowLeft, ArrowRight, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageUploadButton } from '@/components/studio/image-upload-button'
import { useAssets } from '@/hooks/use-media'
import { cn } from '@/lib/utils'

type ImageChoice = { id: string; url: string | null; prompt: string }

export function PostImagePicker({
  selectedIds,
  onChange,
  extraImages = [],
  legacyUrl,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  extraImages?: ImageChoice[]
  legacyUrl?: string | null
}) {
  const { data: library } = useAssets('image')
  const [uploaded, setUploaded] = useState<ImageChoice[]>([])
  const choices = [...uploaded, ...extraImages, ...(library ?? []).filter((asset) => asset.status === 'ready' && asset.storage_path)]
    .filter((asset) => asset.url)
    .filter((asset, index, all) => all.findIndex((candidate) => candidate.id === asset.id) === index)
  const selected = selectedIds.map((id) => choices.find((asset) => asset.id === id))
  const addImage = (id: string) => {
    if (selectedIds.includes(id) || selectedIds.length >= 10) return
    onChange([...selectedIds, id])
  }
  const move = (index: number, direction: -1 | 1) => {
    const next = [...selectedIds]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const previous = next[index]
    next[index] = next[target]
    next[target] = previous
    onChange(next)
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-sm font-medium">Post images</p><p className="text-xs text-muted-foreground">Choose up to 10. The first image is the cover; arrange the rest in display order.</p></div>
      <ImageUploadButton onUploaded={(asset) => {
        setUploaded((current) => [{ id: asset.id, url: asset.url, prompt: asset.prompt }, ...current])
        addImage(asset.id)
      }} />
    </div>
    {legacyUrl && selectedIds.length === 0 && <div className="flex items-center gap-2 rounded-xl border p-2"><img src={legacyUrl} alt="Current post image" className="size-14 rounded-lg object-cover" /><p className="flex-1 text-xs text-muted-foreground">Existing image. Choose new saved images to replace it.</p><Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>Remove</Button></div>}
    {selectedIds.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Selected post images">
      {selected.map((image, index) => <div key={selectedIds[index]} className="relative w-24 rounded-lg border p-1">
        {image?.url ? <img src={image.url} alt={image.prompt} className="aspect-square w-full rounded object-cover" /> : <div className="aspect-square rounded bg-muted" />}
        <span className="absolute left-2 top-2 rounded bg-background/80 px-1 text-[10px]">{index === 0 ? 'Cover' : index + 1}</span>
        <div className="mt-1 flex justify-between">
          <Button type="button" size="icon" variant="ghost" className="size-6" aria-label={`Move image ${index + 1} left`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowLeft className="size-3" /></Button>
          {image?.url && <a href={image.url} target="_blank" rel="noopener noreferrer" download aria-label={`Download image ${index + 1}`} className="inline-flex size-6 items-center justify-center rounded hover:bg-muted"><Download className="size-3" /></a>}
          <Button type="button" size="icon" variant="ghost" className="size-6" aria-label={`Remove image ${index + 1}`} onClick={() => onChange(selectedIds.filter((id) => id !== selectedIds[index]))}><X className="size-3" /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-6" aria-label={`Move image ${index + 1} right`} disabled={index === selectedIds.length - 1} onClick={() => move(index, 1)}><ArrowRight className="size-3" /></Button>
        </div>
      </div>)}
    </div>}
    {choices.length > 0 && <div className="grid max-h-36 grid-cols-5 gap-2 overflow-y-auto sm:grid-cols-8" aria-label="Studio library images">
      {choices.map((image) => <button key={image.id} type="button" aria-label={`Add image: ${image.prompt}`} disabled={selectedIds.length >= 10 || selectedIds.includes(image.id)} onClick={() => addImage(image.id)} className={cn('overflow-hidden rounded-lg border-2 disabled:opacity-50', selectedIds.includes(image.id) ? 'border-primary' : 'border-transparent hover:border-primary/50')}><img src={image.url!} alt={image.prompt} className="aspect-square w-full object-cover" /></button>)}
    </div>}
    {selectedIds.length > 1 && <p className="text-xs text-muted-foreground">Carousel ready for manual posting. Connected publishing is not available yet.</p>}
  </div>
}
