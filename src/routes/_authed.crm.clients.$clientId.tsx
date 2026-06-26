import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  Building2,
  Check,
  Edit3,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  Phone,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useClient,
  useUpdateClient,
} from '@/hooks/use-clients'
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
} from '@/hooks/use-documents'
import type { ClientRow, ClientStatus } from '@/server/clients'
import { CLIENT_STATUSES } from '@/server/clients'
import type { DocumentRow } from '@/server/documents'
import { DocumentPreviewDialog } from '@/components/crm/document-preview-dialog'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/crm/clients/$clientId')({
  component: ClientDetailPage,
})

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Media',
  'Consulting',
  'Other',
]

function ClientDetailPage() {
  const { clientId } = Route.useParams()
  const { data: client, isLoading } = useClient(clientId)
  const { data: documents } = useDocuments(undefined, clientId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Client not found.</p>
          <Button asChild variant="link">
            <Link to="/crm/clients">Back to clients</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/crm/clients">
            <ArrowLeft className="size-4" /> Back to clients
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {client.name}
              </h1>
              <StatusBadge status={client.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Added{' '}
              {formatDistanceToNow(new Date(client.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
          <ClientStatusDropdown clientId={client.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <EditableContactCard client={client} />
          <EditableNotesCard client={client} />
        </div>

        <div className="space-y-4">
          <DocumentsCard documents={documents ?? []} clientId={clientId} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editable contact info card
// ---------------------------------------------------------------------------

function EditableContactCard({ client }: { client: ClientRow }) {
  const updateClient = useUpdateClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(client.name)
  const [email, setEmail] = useState(client.email ?? '')
  const [phone, setPhone] = useState(client.phone ?? '')
  const [company, setCompany] = useState(client.company ?? '')
  const [website, setWebsite] = useState(client.website ?? '')
  const [industry, setIndustry] = useState(client.industry ?? '')
  const [status, setStatus] = useState(client.status)
  const [dateOfBirth, setDateOfBirth] = useState(client.date_of_birth ?? '')

  useEffect(() => {
    setName(client.name)
    setEmail(client.email ?? '')
    setPhone(client.phone ?? '')
    setCompany(client.company ?? '')
    setWebsite(client.website ?? '')
    setIndustry(client.industry ?? '')
    setStatus(client.status)
    setDateOfBirth(client.date_of_birth ?? '')
  }, [client])

  function handleSave() {
    updateClient.mutate({
      id: client.id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      website: website || undefined,
      industry: industry || undefined,
      status,
      date_of_birth: dateOfBirth || undefined,
    })
    setEditing(false)
  }

  function handleCancel() {
    setName(client.name)
    setEmail(client.email ?? '')
    setPhone(client.phone ?? '')
    setCompany(client.company ?? '')
    setWebsite(client.website ?? '')
    setIndustry(client.industry ?? '')
    setStatus(client.status)
    setDateOfBirth(client.date_of_birth ?? '')
    setEditing(false)
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contact information</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="size-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineField label="Name" icon={<Edit3 className="size-4" />}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Email" icon={<Mail className="size-4" />}>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Phone" icon={<Phone className="size-4" />}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Company" icon={<Building2 className="size-4" />}>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Website" icon={<Globe className="size-4" />}>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Industry" icon={<Building2 className="size-4" />}>
              <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InlineField>
            <InlineField label="Status" icon={<Edit3 className="size-4" />}>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ClientStatus)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InlineField>
            <InlineField label="Date of Birth" icon={<Edit3 className="size-4" />}>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contact information</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Edit3 className="size-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow
            icon={<Edit3 className="size-4" />}
            label="Name"
            value={client.name}
          />
          <InfoRow
            icon={<Mail className="size-4" />}
            label="Email"
            value={client.email}
          />
          <InfoRow
            icon={<Phone className="size-4" />}
            label="Phone"
            value={client.phone}
          />
          <InfoRow
            icon={<Building2 className="size-4" />}
            label="Company"
            value={client.company}
          />
          <InfoRow
            icon={<Globe className="size-4" />}
            label="Website"
            value={client.website}
          />
          <InfoRow
            icon={<Building2 className="size-4" />}
            label="Industry"
            value={client.industry}
          />
          <InfoRow
            icon={<Edit3 className="size-4" />}
            label="Status"
            value={client.status}
            capitalize
          />
          <InfoRow
            icon={<Edit3 className="size-4" />}
            label="Date of Birth"
            value={client.date_of_birth ? format(new Date(client.date_of_birth), 'MMM d, yyyy') : null}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Editable notes card
// ---------------------------------------------------------------------------

function EditableNotesCard({ client }: { client: ClientRow }) {
  const updateClient = useUpdateClient()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(client.notes ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNotes(client.notes ?? '')
  }, [client])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editing])

  function handleSave() {
    updateClient.mutate({ id: client.id, notes: notes || undefined })
    setEditing(false)
  }

  function handleCancel() {
    setNotes(client.notes ?? '')
    setEditing(false)
  }

  if (!editing && !client.notes) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notes</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Plus className="size-3.5" /> Add note
          </Button>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setEditing(true)}
            className="w-full rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground hover:border-solid hover:bg-muted/50"
          >
            <Plus className="mx-auto mb-1 size-4" />
            Click to add notes
          </button>
        </CardContent>
      </Card>
    )
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notes</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="size-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this client..."
            rows={5}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Notes</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Edit3 className="size-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Documents card
// ---------------------------------------------------------------------------

function DocumentsCard({
  documents,
  clientId,
}: {
  documents: DocumentRow[]
  clientId: string
}) {
  const [uploading, setUploading] = useState(false)
  const uploadDoc = useUploadDocument()
  const deleteDoc = useDeleteDocument()
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
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

function DocumentItem({
  doc,
  onDelete,
  processing,
}: {
  doc: DocumentRow
  onDelete: (id: string) => void
  processing?: boolean
}) {
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

// ---------------------------------------------------------------------------
// Status dropdown
// ---------------------------------------------------------------------------

function ClientStatusDropdown({ clientId }: { clientId: string }) {
  const updateClient = useUpdateClient()
  return (
    <Select
      value={updateClient.isPending ? undefined : undefined}
      onValueChange={(v) =>
        updateClient.mutate({
          id: clientId,
          status: v as ClientStatus,
        })
      }
    >
      <SelectTrigger className="w-36">
        <SelectValue placeholder="Change status" />
      </SelectTrigger>
      <SelectContent>
        {CLIENT_STATUSES.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ClientStatus }) {
  const cfg = CLIENT_STATUSES.find((s) => s.value === status)
  if (!cfg) return null
  return (
    <Badge
      className="text-xs"
      style={{
        backgroundColor: cfg.color + '20',
        color: cfg.color,
        borderColor: cfg.color + '40',
      }}
      variant="outline"
    >
      {cfg.label}
    </Badge>
  )
}

function InfoRow({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  capitalize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span
        className={cn(
          'max-w-[60%] truncate text-right text-sm font-medium',
          capitalize && 'capitalize',
        )}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function InlineField({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
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

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  // Skip compression for small files and animated GIFs
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

  // Choose output format and quality per type
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
