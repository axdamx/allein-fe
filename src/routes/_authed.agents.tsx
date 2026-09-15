import { useState } from 'react'
import { ArrowUpRight, Bot, MoreVertical, Pause, Play, Plus } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { NewAgentModal } from '@/components/agents/new-agent-modal'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { usePlan } from '@/hooks/use-plan'
import { UsageIndicator } from '@/components/billing/usage-indicator'
import { getLucideIcon } from '@/lib/icons'

const AgentsPage = () => {
  const { user } = Route.useRouteContext()
  const { data: agents, isLoading } = useAgents()
  const { data: agentTypes } = useAgentTypes()
  const updateStatus = useUpdateAgentStatus()
  const { canDo } = usePlan()
  const [newAgentOpen, setNewAgentOpen] = useState(false)

  const typeMap = new Map(agentTypes?.map((t) => [t.key, t]))
  const activeCount = agents?.filter((agent) => agent.status === 'active').length ?? 0
  const pausedCount = agents?.filter((agent) => agent.status === 'paused').length ?? 0
  const conversationCount = agents?.reduce((sum, agent) => sum + agent.conversations_count, 0) ?? 0

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <PageHeader
        eyebrow="AI workforce"
        icon={Bot}
        title="Agents"
        description="Build a focused digital team, see who is active, and adjust each agent as your business evolves."
        actions={(
          <Button onClick={() => setNewAgentOpen(true)} disabled={!canDo('agents')}>
            <Plus className="size-4" /> New Agent
          </Button>
        )}
      />

      <UsageIndicator metric="agents" label="agents" />

      {!isLoading && agents && agents.length > 0 && (
        <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Agent team overview">
          {[
            { label: 'Active now', value: activeCount, accent: 'text-[#5E966D]' },
            { label: 'Paused', value: pausedCount, accent: 'text-[#C58A28]' },
            { label: 'Conversations', value: conversationCount, accent: 'text-[#E95F36]' },
          ].map((metric) => (
            <article key={metric.label} className="rounded-[20px] border border-black/[0.05] bg-white/40 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.025]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{metric.label}</p>
              <p className={`mt-1 text-2xl font-semibold tracking-[-0.04em] tabular-nums ${metric.accent}`}>{metric.value}</p>
            </article>
          ))}
        </section>
      )}

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
              <Card key={agent.id} className="app-interactive-card min-h-[230px] gap-0 overflow-hidden py-0">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 p-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 items-center justify-center rounded-2xl"
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
                <CardContent className="flex-1 border-t border-black/[0.05] py-4 dark:border-white/10">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-black/[0.025] p-2.5 dark:bg-white/[0.035]">
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
                    <div className="rounded-xl bg-black/[0.025] p-2.5 dark:bg-white/[0.035]">
                      <p className="text-muted-foreground">Conversations</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums">
                        {agent.conversations_count}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/[0.025] p-2.5 dark:bg-white/[0.035]">
                      <p className="text-muted-foreground">Model</p>
                      <p className="mt-1 truncate font-semibold">{agent.model}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-black/[0.05] px-5 py-3 dark:border-white/10">
                  <Button asChild variant="ghost" size="sm" className="ml-auto text-[#E95F36] hover:text-[#E95F36]">
                    <Link to="/chat">Open in chat <ArrowUpRight className="size-3.5" /></Link>
                  </Button>
                </CardFooter>
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
            <Button onClick={() => setNewAgentOpen(true)} disabled={!canDo('agents')}>
              <Plus className="size-4" /> Create your first agent
            </Button>
          </CardContent>
        </Card>
      )}

      <NewAgentModal
        open={newAgentOpen}
        onOpenChange={setNewAgentOpen}
        userAgentType={user?.agent_type}
      />
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/agents')({
  component: AgentsPage,
})
