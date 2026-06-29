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
  Calendar,
  CalendarDays,
  Plus,
  Search,
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isPast, parseISO } from 'date-fns'
import { createFileRoute, Link } from '@tanstack/react-router'

import { NewLeadDialog } from '@/components/crm/new-lead-dialog'
import { StatusCell } from '@/components/crm/leads-status-cell'
import { ActionsCell } from '@/components/crm/leads-actions-cell'
import { EmptyLeads } from '@/components/crm/empty-leads'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useLeads } from '@/hooks/use-crm'
import type { LeadRow } from '@/server/crm'
import { cn } from '@/lib/utils'

export type FilterMode = 'all' | 'today'

const LeadsPage = () => {
  const { data: leads, isLoading } = useLeads()
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  const todayStr = new Date().toISOString().split('T')[0]

  const filteredLeads = useMemo(() => {
    if (!leads) return []
    if (filterMode === 'today') {
      return leads.filter((l) => l.scheduled_date === todayStr)
    }
    return leads
  }, [leads, filterMode, todayStr])

  const todayCount = useMemo(() => {
    return (leads ?? []).filter((l) => l.scheduled_date === todayStr).length
  }, [leads, todayStr])

  const columns = useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const lead = row.original
          const isDueToday = lead.scheduled_date === todayStr
          return (
            <div className="flex items-center gap-2">
              {isDueToday && (
                <span className="size-1.5 shrink-0 rounded-full bg-primary" />
              )}
              <Link
                to="/crm/leads/$leadId"
                params={{ leadId: lead.id }}
                className={cn('font-medium hover:underline', isDueToday && 'text-primary')}
              >
                {lead.name}
              </Link>
            </div>
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
        accessorKey: 'scheduled_date',
        header: 'Scheduled',
        cell: ({ row }) => {
          const date = row.getValue<string | null>('scheduled_date')
          if (!date) return <span className="text-sm text-muted-foreground">—</span>
          const d = parseISO(date)
          const dueToday = isToday(d)
          const overdue = isPast(d) && !isToday(d)
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-sm',
                dueToday && 'font-medium text-primary',
                overdue && 'text-red-500',
              )}
            >
              <CalendarDays className="size-3" />
              {format(d, 'MMM d')}
              {dueToday && <Badge className="ml-1 h-4 px-1 text-[9px]">Today</Badge>}
            </span>
          )
        },
        sortingFn: (a, b) => {
          const aDate = a.original.scheduled_date ?? ''
          const bDate = b.original.scheduled_date ?? ''
          return aDate.localeCompare(bDate)
        },
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
    [todayStr],
  )

  const table = useReactTable({
    data: filteredLeads,
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
            {leads?.length ?? 0} prospect{leads?.length === 1 ? '' : 's'} in your pipeline
          </p>
        </div>
        <Button onClick={() => setNewLeadOpen(true)}>
          <Plus className="size-4" /> New Lead
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b p-3">
            <div className="relative max-w-xs flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
              <button
                onClick={() => setFilterMode('all')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  filterMode === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('today')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  filterMode === 'today'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Calendar className="size-3.5" />
                Today
                {todayCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {todayCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredLeads.length > 0 ? (
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
            <EmptyLeads onCreate={() => setNewLeadOpen(true)} filterMode={filterMode} />
          )}
        </CardContent>
      </Card>

      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </>
  )
}

export const Route = createFileRoute('/_authed/crm/leads/')({
  component: LeadsPage,
})

export type { LeadStatus } from '@/server/crm'
