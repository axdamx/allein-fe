import { useState, useEffect } from 'react'
import { Download, FileText, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDocumentUrl } from '@/hooks/use-documents'

interface Props {
  documentId: string
  fileName: string
  mimeType: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentPreviewDialog({
  documentId,
  fileName,
  mimeType,
  open,
  onOpenChange,
}: Props) {
  const { data: urlData, isLoading } = useDocumentUrl(open ? documentId : null)
  const signedUrl =
    urlData && !('error' in urlData) ? urlData.signed_url : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between shrink-0">
          <DialogTitle className="truncate text-base">{fileName}</DialogTitle>
          <div className="flex items-center gap-1">
            {signedUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={signedUrl} download={fileName}>
                  <Download className="size-3.5" /> Download
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && signedUrl && (
            <PreviewContent
              signedUrl={signedUrl}
              mimeType={mimeType}
              fileName={fileName}
            />
          )}
          {!isLoading && !signedUrl && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Preview not available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PreviewContent({
  signedUrl,
  mimeType,
  fileName,
}: {
  signedUrl: string
  mimeType: string
  fileName: string
}) {
  if (mimeType.startsWith('image/')) {
    return (
      <div className="flex items-center justify-center h-full">
        <img
          src={signedUrl}
          alt={fileName}
          className="max-w-full max-h-full rounded object-contain"
        />
      </div>
    )
  }

  if (mimeType === 'application/pdf') {
    return (
      <iframe
        src={signedUrl}
        className="h-full w-full rounded border"
        title={fileName}
      />
    )
  }

  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/rtf'
  ) {
    return <TextPreview signedUrl={signedUrl} fileName={fileName} />
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-sm text-muted-foreground">
      <FileText className="size-12" />
      <p>Preview not available for this file type</p>
      <Button variant="outline" asChild>
        <a href={signedUrl} download={fileName}>
          <Download className="size-3.5" /> Download to view
        </a>
      </Button>
    </div>
  )
}

function TextPreview({
  signedUrl,
}: {
  signedUrl: string
  fileName: string
}) {
  const [text, setText] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(signedUrl)
      .then((r) => r.text())
      .then((content) => {
        if (!cancelled) setText(content)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [signedUrl])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Failed to load file content
      </div>
    )
  }

  if (text === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <pre className="h-full w-full overflow-auto rounded border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
      {text}
    </pre>
  )
}
