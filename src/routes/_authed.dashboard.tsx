import { useState, useEffect } from 'react'
import { Bot, MessageSquare, Plus, TrendingUp, Users } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { StatCard } from '@/components/dashboard/stat-card'
import { TodaysBox } from '@/components/dashboard/todays-box'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { GettingStartedCard } from '@/components/dashboard/getting-started-card'
import { EmptyAgents } from '@/components/dashboard/empty-agents'
import { getGreeting, formatNumber, formatCurrency } from '@/components/dashboard/dashboard-utils'
import { UsageLimitBanner } from '@/components/billing/usage-limit-banner'
import { NewAgentModal } from '@/components/agents/new-agent-modal'
import { GoalsDashboardCard } from '@/components/goals/goals-dashboard-card'
import { startTour, hasSeenTour } from '@/components/onboarding/product-tour'
import { DashboardShell } from '@/components/layout/dashboard-shell'
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
import { usePlan } from '@/hooks/use-plan'
import { motion } from '@/lib/animations'
import type { Stat } from '@/lib/types'

const DashboardPage = () => {
  const { user } = Route.useRouteContext()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: agents, isLoading: agentsLoading } = useAgents()
  const { canDo } = usePlan()
  const [newAgentOpen, setNewAgentOpen] = useState(false)

  const greeting = getGreeting()

  // Auto-run the product tour once for new users (after data + layout settle).
  useEffect(() => {
    if (hasSeenTour()) return
    // Small delay so the dashboard layout is painted before driver.js measures
    // the target elements.
    const t = setTimeout(() => { void startTour() }, 600)
    return () => clearTimeout(t)
  }, [])

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
        <Button onClick={() => setNewAgentOpen(true)} disabled={!canDo('agents')}>
          <Plus className="size-4" /> New Agent
        </Button>
      </div>

      <UsageLimitBanner className="mb-4" />

      <GettingStartedCard />

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
                <EmptyAgents onCreate={() => setNewAgentOpen(true)} disabled={!canDo('agents')} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick actions — surfaces modules not linked elsewhere on the dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          <QuickActions />
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

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})
