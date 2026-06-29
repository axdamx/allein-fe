import { useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentRow } from '@/server/documents'
import { DocumentPreviewDialog } from '@/components/crm/document-preview-dialog'
import { cn } from '@/lib/utils'

export const DocumentItem = ({
  doc,
  onDelete,
  processing,
}: {
  doc: DocumentRow
  onDelete: (id: string) => void
  processing?: boolean
}) => {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between rounded-md border p-2',
          doc.status === 'failed' && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{doc.name}</p>
          <p className="text-xs text-muted-foreground">
            {processing
              ? 'Processing…'
              : doc.status === 'failed'
                ? 'Failed'
                : doc.chunk_count > 0
                  ? `${doc.chunk_count} chunks`
                  : 'Stored'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!processing && doc.status === 'ready' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-3.5" />
            </Button>
          )}
          {!processing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(doc.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      {doc.status === 'ready' && (
        <DocumentPreviewDialog
          documentId={doc.id}
          fileName={doc.name}
          mimeType={doc.mime_type ?? ''}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  )
}
