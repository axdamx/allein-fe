import { useRef } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUploadStudioImage } from '@/hooks/use-media'
import type { StudioAssetRow } from '@/server/media'

export function ImageUploadButton({
  onUploaded,
  label = 'Upload image',
}: {
  onUploaded?: (asset: StudioAssetRow) => void
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadStudioImage()

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        aria-label="Choose image to upload"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          try {
            const result = await upload.mutateAsync(file)
            if ('id' in result) onUploaded?.(result)
          } catch {
            // The mutation displays the error toast.
          }
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
        {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {upload.isPending ? 'Uploading…' : label}
      </Button>
    </>
  )
}
