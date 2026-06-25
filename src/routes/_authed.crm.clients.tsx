import { useState, useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'

import { ClientFormDialog } from '@/components/crm/client-form-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useClients, useDeleteClient } from '@/hooks/use-clients'
import type { ClientRow, ClientStatus } from '@/server/clients'
import { CLIENT_STATUSES } from '@/server/clients'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/crm/clients')({
  component: ClientsPage,
})

function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const deleteClient = useDeleteClient()

  const columns = useMemo<ColumnDef<ClientRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('name')}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.getValue('email') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'company',
        header: 'Company',
        cell: ({ row }) => row.getValue('company') || '—',
      },
      {
        accessorKey: 'industry',
        header: 'Industry',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.getValue('industry') || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.getValue<ClientStatus>('status')} />,
      },
      {
        accessorKey: 'created_at',
        header: 'Added',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(row.getValue('created_at')), {
              addSuffix: true,
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setEditingClient(row.original)
                  setFormOpen(true)
                }}
              >
                Edit client
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => deleteClient.mutate(row.original.id)}
              >
                Delete client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteClient],
  )

  const table = useReactTable({
    data: clients ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  function handleNewClient() {
    setEditingClient(null)
    setFormOpen(true)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {clients?.length ?? 0} client{clients?.length === 1 ? '' : 's'} in
            your database
          </p>
        </div>
        <Button onClick={handleNewClient}>
          <Plus className="size-4" /> New Client
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : clients && clients.length > 0 ? (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              'inline-flex items-center gap-1',
                              header.column.getCanSort() &&
                                'hover:text-foreground',
                            )}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getIsSorted() === 'asc' && (
                              <ArrowUp className="size-3" />
                            )}
                            {header.column.getIsSorted() === 'desc' && (
                              <ArrowDown className="size-3" />
                            )}
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyClients onCreate={handleNewClient} />
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editingClient}
      />
    </>
  )
}

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

function EmptyClients({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Users className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No clients yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first client to start managing your customer database.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" /> Add client
      </Button>
    </div>
  )
}
