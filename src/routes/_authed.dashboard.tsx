import { useState } from 'react'
import { ArrowRight, Bot, CalendarDays, Check, FileText, MessageSquare, Plus, TrendingUp, Users } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { isPast, parseISO } from 'date-fns'

import { StatCard } from '@/components/dashboard/stat-card'
import { UsageLimitBanner } from '@/components/billing/usage-limit-banner'
import { NewAgentModal } from '@/components/agents/new-agent-modal'
import { GoalsDashboardCard } from '@/components/goals/goals-dashboard-card'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/hooks/use-dashboard'
import { useAgents } from '@/hooks/use-agents'
import { useTodaysLeads, useUpdateLead } from '@/hooks/use-crm'
import { motion } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { Stat } from '@/lib/types'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: agents, isLoading: agentsLoading } = useAgents()
  const [newAgentOpen, setNewAgentOpen] = useState(false)

  const greeting = getGreeting()

  const statCards: Stat[] = [
    {
      id: 'agents',
      label: 'Active Agents',
      value: String(stats?.active_agents ?? 0),
      delta: 0,
      trend: 'up',
      icon: Bot,
    },
    {
      id: 'conversations',
      label: 'Conversations',
      value: formatNumber(stats?.conversations ?? 0),
      delta: 0,
      trend: 'up',
      icon: MessageSquare,
    },
    {
      id: 'leads',
      label: 'Total Leads',
      value: formatNumber(stats?.leads ?? 0),
      delta: 0,
      trend: 'up',
      icon: Users,
    },
    {
      id: 'pipeline',
      label: 'Pipeline Value',
      value: formatCurrency(stats?.pipeline_value ?? 0),
      delta: 0,
      trend: 'up',
      icon: TrendingUp,
    },
  ]

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {user?.email?.split('@')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here's what's happening across your agents.
          </p>
        </div>
        <Button onClick={() => setNewAgentOpen(true)}>
          <Plus className="size-4" /> New Agent
        </Button>
      </div>

      <UsageLimitBanner className="mb-4" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat, i) => <StatCard key={stat.id} stat={stat} index={i} />)}
      </div>

      <TodaysBox />

      <div className="mt-4">
        <GoalsDashboardCard />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agents list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Your Agents</CardTitle>
                <CardDescription>Active and paused agents</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/agents">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : agents && agents.length > 0 ? (
                <ul className="space-y-1">
                  {agents.slice(0, 5).map((agent) => (
                    <li
                      key={agent.id}
                      className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary"
                        >
                          <Bot className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.name}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {agent.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {agent.conversations_count} chats
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
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
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyAgents onCreate={() => setNewAgentOpen(true)} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick stats sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>At a glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <OverviewRow
                icon={<MessageSquare className="size-4" />}
                label="Messages sent"
                value={formatNumber(stats?.messages ?? 0)}
              />
              <OverviewRow
                icon={<Users className="size-4" />}
                label="New leads"
                value={String(stats?.new_leads ?? 0)}
              />
              <OverviewRow
                icon={<TrendingUp className="size-4" />}
                label="Open deals"
                value={String(stats?.open_deals ?? 0)}
              />
              <OverviewRow
                icon={<FileText className="size-4" />}
                label="Documents"
                value={String(stats?.documents ?? 0)}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <NewAgentModal
        open={newAgentOpen}
        onOpenChange={setNewAgentOpen}
        userAgentType={user?.agent_type}
      />
    </DashboardShell>
  )
}

function TodaysBox() {
  const { data: todaysLeads, isLoading } = useTodaysLeads()
  const updateLead = useUpdateLead()

  if (isLoading) {
    return (
      <div className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!todaysLeads || todaysLeads.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="mt-4"
    >
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" />
              Today's Box
            </CardTitle>
            <CardDescription>
              {todaysLeads.length} card{todaysLeads.length === 1 ? '' : 's'} in today's slot
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/crm/leads">
              View all <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="space-y-1">
            {todaysLeads.slice(0, 5).map((lead) => {
              const isOverdue = lead.scheduled_date && isPast(parseISO(lead.scheduled_date)) && lead.scheduled_date !== new Date().toISOString().split('T')[0]
              return (
                <div
                  key={lead.id}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50',
                    isOverdue && 'border-l-2 border-red-400 pl-[6px]',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Link
                      to="/crm/leads/$leadId"
                      params={{ leadId: lead.id }}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {lead.company && `· ${lead.company}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {lead.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        updateLead.mutate({
                          id: lead.id,
                          scheduled_date: null,
                        })
                      }
                    >
                      <Check className="size-3" /> Done
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function OverviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function EmptyAgents({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Bot className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No agents yet</p>
        <p className="text-xs text-muted-foreground">
          Create your first AI agent to get started.
        </p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus className="size-4" /> Create agent
      </Button>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCurrency(n: number): string {
  if (n === 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n}`
}
