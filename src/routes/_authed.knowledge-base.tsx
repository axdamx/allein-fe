import { useRef, useState } from 'react'
import {
  FileText,
  Loader2,
  Trash2,
  Upload,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FeatureGate } from '@/components/billing/feature-gate'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-documents'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/knowledge-base')({
  component: KnowledgeBasePage,
})

function KnowledgeBasePage() {
  const { user } = Route.useRouteContext()
  const { data: documents, isLoading } = useDocuments()
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    for (const file of Array.from(files)) {
      const isBinary =
        file.type.includes('pdf') ||
        file.type.includes('octet-stream') ||
        file.name.endsWith('.pdf')

      // Read binary files as base64, text files as UTF-8
      let content: string
      if (isBinary) {
        const buffer = await file.arrayBuffer()
        content = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            '',
          ),
        )
      } else {
        content = await file.text()
      }

      await uploadDoc.mutateAsync({
        name: file.name,
        mimeType: file.type || (isBinary ? 'application/pdf' : 'text/plain'),
        content,
        isBase64: isBinary,
        sizeBytes: file.size,
      })
    }
    setUploading(false)
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const readyCount = documents?.filter((d) => d.status === 'ready').length ?? 0
  const totalChunks = documents?.reduce((sum, d) => sum + d.chunk_count, 0) ?? 0

  return (
    <FeatureGate feature="ragDocuments">
      <DashboardShell
        userEmail={user?.email}
        userName={user?.email?.split('@')[0]}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Knowledge Base
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload documents so your agents can answer from your data (RAG).
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,text/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Documents</span>
              </div>
              <p className="mt-1 text-2xl font-semibold">
                {documents?.length ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Ready</span>
              </div>
              <p className="mt-1 text-2xl font-semibold">{readyCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Total chunks
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold">{totalChunks}</p>
            </CardContent>
          </Card>
        </div>

        {/* How RAG works info banner */}
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 py-3">
            <Brain className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">How RAG works</p>
              <p className="mt-0.5 text-muted-foreground">
                When you chat with an agent, it searches these documents for
                relevant context and includes it in the AI's prompt. The agent
                answers using your data — no model fine-tuning required.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Document list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isProcessing = ['processing', 'extracting', 'chunking', 'embedding', 'storing'].includes(doc.status)
              return (
                <Card key={doc.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        isProcessing ? "bg-primary/10" : "bg-muted",
                      )}>
                        {isProcessing ? (
                          <Loader2 className="size-5 animate-spin text-primary" />
                        ) : (
                          <FileText className="size-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{doc.name}</p>
                        {isProcessing ? (
                          <ProcessingProgress status={doc.status} chunkCount={doc.chunk_count} />
                        ) : (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <StatusBadge status={doc.status} />
                            <span>{doc.chunk_count} chunks</span>
                            {doc.size_bytes && <span>{formatBytes(doc.size_bytes)}</span>}
                            <span>
                              {formatDistanceToNow(new Date(doc.created_at))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteDoc.mutate(doc.id)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Upload className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No documents yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload text files, markdown, or CSVs to build your knowledge
                  base.
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" /> Upload your first document
              </Button>
            </CardContent>
          </Card>
        )}
      </DashboardShell>
    </FeatureGate>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: typeof CheckCircle2; className: string }
  > = {
    ready: {
      icon: CheckCircle2,
      className: 'text-emerald-600 dark:text-emerald-400',
    },
    processing: {
      icon: Clock,
      className: 'text-amber-600 dark:text-amber-400',
    },
    failed: {
      icon: XCircle,
      className: 'text-red-600 dark:text-red-400',
    },
    pending: {
      icon: Clock,
      className: 'text-muted-foreground',
    },
  }

  const cfg = config[status] ?? config.pending
  const Icon = cfg.icon

  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', cfg.className)}>
      <Icon className="size-3" />
      <span className="capitalize">{status}</span>
    </span>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Visual progress bar for documents moving through the RAG pipeline.
 * Shows which step is active + estimated completion.
 */
const PIPELINE_STEPS = [
  { status: 'extracting', label: 'Extracting text', percent: 15 },
  { status: 'chunking', label: 'Chunking', percent: 35 },
  { status: 'embedding', label: 'Generating embeddings', percent: 65 },
  { status: 'storing', label: 'Storing vectors', percent: 90 },
] as const

function ProcessingProgress({
  status,
  chunkCount,
}: {
  status: string
  chunkCount: number
}) {
  const step = PIPELINE_STEPS.find((s) => s.status === status)
  const percent = step?.percent ?? 5
  const label = step?.label ?? 'Starting…'

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-primary">
          <Loader2 className="size-3 animate-spin" />
          {label}
        </span>
        {chunkCount > 0 && status === 'embedding' && (
          <span className="text-muted-foreground">{chunkCount} chunks</span>
        )}
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  )
}
