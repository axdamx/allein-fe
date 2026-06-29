import { useState, useRef } from 'react'
import { FileText, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useUploadDocument, useDeleteDocument } from '@/hooks/use-documents'
import type { DocumentRow } from '@/server/documents'
import { DocumentItem } from '@/components/crm/client-document-item'

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const compressImageIfNeeded = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) return file

  if (file.size < 100 * 1024) return file
  if (file.type === 'image/gif') return file

  const img = new Image()
  const url = URL.createObjectURL(file)
  img.src = url

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const MAX_DIM = 1920
  let { width, height } = img
  if (width > MAX_DIM || height > MAX_DIM) {
    if (width > height) {
      height = Math.round((height / width) * MAX_DIM)
      width = MAX_DIM
    } else {
      width = Math.round((width / height) * MAX_DIM)
      height = MAX_DIM
    }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file

  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(url)

  const outputType = file.type === 'image/png' ? 'image/png' : file.type === 'image/gif' ? 'image/png' : 'image/jpeg'
  const quality = file.type === 'image/webp' ? 0.85 : 0.8

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size < file.size * 0.9) {
          resolve(new File([blob], file.name, { type: outputType }))
        } else if (blob) {
          resolve(file)
        } else {
          resolve(file)
        }
      },
      outputType,
      quality,
    )
  })
}

export const DocumentsCard = ({
  documents,
  clientId,
}: {
  documents: DocumentRow[]
  clientId: string
}) => {
  const [uploading, setUploading] = useState(false)
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const compressed = await compressImageIfNeeded(file)
      const content = await fileToBase64(compressed)
      uploadDoc.mutate(
        {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          content,
          isBase64: true,
          sizeBytes: compressed.size,
          clientId,
        },
        {
          onSettled: () => {
            setUploading(false)
          },
        },
      )
    } catch {
      setUploading(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const processingDocs = documents.filter(
    (d) =>
      d.status === 'processing' ||
      d.status === 'extracting' ||
      d.status === 'chunking' ||
      d.status === 'embedding' ||
      d.status === 'storing',
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" /> Documents
        </CardTitle>
        <CardDescription>
          Files and documents linked to this client
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="client-doc-upload"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {uploading ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>

          {processingDocs.length > 0 && (
            <div className="space-y-1.5">
              {processingDocs.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  onDelete={(id) => deleteDoc.mutate(id)}
                  processing
                />
              ))}
            </div>
          )}

          {documents
            .filter((d) => d.status === 'ready' || d.status === 'failed')
            .map((doc) => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                onDelete={(id) => deleteDoc.mutate(id)}
              />
            ))}

          {documents.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No documents linked yet.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
