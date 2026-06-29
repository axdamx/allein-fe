import { ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useClient,
} from '@/hooks/use-clients'
import {
  useDocuments,
} from '@/hooks/use-documents'
import { StatusBadge } from '@/components/crm/client-status-badge'
import { EditableContactCard } from '@/components/crm/client-editable-contact-card'
import { EditableNotesCard } from '@/components/crm/client-editable-notes-card'
import { DocumentsCard } from '@/components/crm/client-documents-card'
import { ClientStatusDropdown } from '@/components/crm/client-status-dropdown'

const ClientDetailPage = () => {
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

export const Route = createFileRoute('/_authed/crm/clients/$clientId')({
  component: ClientDetailPage,
})
