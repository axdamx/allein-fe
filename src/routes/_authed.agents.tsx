import { useState } from 'react'
import { Bot, MoreVertical, Pause, Play, Plus } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { NewAgentModal } from '@/components/agents/new-agent-modal'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAgents, useAgentTypes, useUpdateAgentStatus } from '@/hooks/use-agents'
import { getLucideIcon } from '@/lib/icons'

export const Route = createFileRoute('/_authed/agents')({
  component: AgentsPage,
})

function AgentsPage() {
  const { user } = Route.useRouteContext()
  const { data: agents, isLoading } = useAgents()
  const { data: agentTypes } = useAgentTypes()
  const updateStatus = useUpdateAgentStatus()
  const [newAgentOpen, setNewAgentOpen] = useState(false)

  const typeMap = new Map(agentTypes?.map((t) => [t.key, t]))

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Manage your AI agents and their configurations.
          </p>
        </div>
        <Button onClick={() => setNewAgentOpen(true)}>
          <Plus className="size-4" /> New Agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => {
            const type = typeMap?.get(agent.type)
            const Icon = getLucideIcon(type?.icon)
            const accent = type?.accent_color ?? '#6366f1'
            return (
              <Card key={agent.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accent}20` }}
                    >
                      <Icon className="size-5" style={{ color: accent }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {agent.type.replace('_', ' ')}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {agent.status === 'active' ? (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatus.mutate({
                              agentId: agent.id,
                              status: 'paused',
                            })
                          }
                        >
                          <Pause className="size-4" /> Pause
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() =>
                            updateStatus.mutate({
                              agentId: agent.id,
                              status: 'active',
                            })
                          }
                        >
                          <Play className="size-4" /> Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <span
                        className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          agent.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : agent.status === 'paused'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Conversations</p>
                      <p className="mt-0.5 font-medium">
                        {agent.conversations_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p className="mt-0.5 font-medium">{agent.model}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Bot className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No agents yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first AI agent to start automating.
              </p>
            </div>
            <Button onClick={() => setNewAgentOpen(true)}>
              <Plus className="size-4" /> Create your first agent
            </Button>
          </CardContent>
        </Card>
      )}

      <NewAgentModal open={newAgentOpen} onOpenChange={setNewAgentOpen} />
    </DashboardShell>
  )
}
