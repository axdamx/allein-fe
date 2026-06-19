import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { Agent, AgentStatus } from '@/data/mock'
import { agents as mockAgents } from '@/data/mock'

const statusVariant: Record<
  AgentStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className:
      'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  idle: {
    label: 'Idle',
    className:
      'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  error: {
    label: 'Error',
    className:
      'border-transparent bg-red-500/15 text-red-700 dark:text-red-400',
  },
}

function fetchAgents(): Promise<Agent[]> {
  // Mock async fetch — resolves with static data.
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockAgents), 400)
  })
}

export function AgentsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  })

  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Agents</CardTitle>
        <CardDescription>Performance of your deployed agents</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Success</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows />
            ) : (
              data?.map((agent) => {
                const variant = statusVariant[agent.status]
                return (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {agent.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={variant.className}>
                        {variant.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.successRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.tasksHandled}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {agent.lastActive}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function LoadingRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((__, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}
