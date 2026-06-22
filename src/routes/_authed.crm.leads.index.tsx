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
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { LeadStatusBadge } from '@/components/crm/lead-status-badge'
import { NewLeadDialog } from '@/components/crm/new-lead-dialog'
import { Button } from '@/components/ui/button'
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
import { useLeads, useUpdateLead, useDeleteLead } from '@/hooks/use-crm'
import type { LeadRow, LeadStatus } from '@/server/crm'
import { LEAD_STATUSES } from '@/server/crm'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/crm/leads/')({
  component: LeadsPage,
})

const STATUS_OPTIONS = LEAD_STATUSES

function LeadsPage() {
  const { data: leads, isLoading } = useLeads()
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const lead = row.original
          return (
            <Link
              to="/crm/leads/$leadId"
              params={{ leadId: lead.id }}
              className="font-medium hover:underline"
            >
              {lead.name}
            </Link>
          )
        },
      },
      {
        accessorKey: 'company',
        header: 'Company',
        cell: ({ row }) => row.getValue('company') || '—',
      },
      {
        accessorKey: 'email',
        header: 'Contact',
        cell: ({ row }) => {
          const lead = row.original
          return (
            <div className="text-sm text-muted-foreground">
              {lead.email || lead.phone || '—'}
            </div>
          )
        },
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => (
          <span className="capitalize text-sm text-muted-foreground">
            {row.getValue('source')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusCell lead={row.original} />,
      },
      {
        accessorKey: 'value',
        header: 'Value',
        cell: ({ row }) => {
          const v = row.getValue<number>('value')
          return v > 0 ? (
            <span className="font-medium">
              ${v.toLocaleString()}
            </span>
          ) : (
            '—'
          )
        },
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
        cell: ({ row }) => <ActionsCell lead={row.original} />,
      },
    ],
    [],
  )

  const table = useReactTable({
    data: leads ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads?.length ?? 0} prospect{leads?.length === 1 ? '' : 's'} in
            your pipeline
          </p>
        </div>
        <Button onClick={() => setNewLeadOpen(true)}>
          <Plus className="size-4" /> New Lead
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads…"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : leads && leads.length > 0 ? (
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
            <EmptyLeads onCreate={() => setNewLeadOpen(true)} />
          )}
        </CardContent>
      </Card>

      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </>
  )
}

function StatusCell({ lead }: { lead: LeadRow }) {
  const updateLead = useUpdateLead()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex">
          <LeadStatusBadge status={lead.status} />
          <ChevronDown className="ml-1 size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() =>
              updateLead.mutate({ id: lead.id, status: opt.value })
            }
          >
            <LeadStatusBadge status={opt.value} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ActionsCell({ lead }: { lead: LeadRow }) {
  const deleteLead = useDeleteLead()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/crm/leads/$leadId" params={{ leadId: lead.id }}>
            View details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/crm/leads/$leadId" params={{ leadId: lead.id }}>
            Add reminder
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => deleteLead.mutate(lead.id)}
        >
          Delete lead
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyLeads({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Users className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No leads yet</p>
        <p className="text-sm text-muted-foreground">
          Add your first prospect or let your agents capture leads for you.
        </p>
      </div>
      <Button onClick={onCreate}>
        <Plus className="size-4" /> Add lead
      </Button>
    </div>
  )
}

export type { LeadStatus }
