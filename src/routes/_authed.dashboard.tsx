import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  MessageSquare,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { EmptyAgents } from '@/components/dashboard/empty-agents'
import { GettingStartedCard } from '@/components/dashboard/getting-started-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { StatCard } from '@/components/dashboard/stat-card'
import { TodaysBox } from '@/components/dashboard/todays-box'
import { formatCurrency, formatNumber, getGreeting } from '@/components/dashboard/dashboard-utils'
import { UsageLimitBanner } from '@/components/billing/usage-limit-banner'
import { NewAgentModal } from '@/components/agents/new-agent-modal'
import { GoalsDashboardCard } from '@/components/goals/goals-dashboard-card'
import { startTour, hasSeenTour } from '@/components/onboarding/product-tour'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStats } from '@/hooks/use-dashboard'
import { useAgents } from '@/hooks/use-agents'
import { usePlan } from '@/hooks/use-plan'
import { motion } from '@/lib/animations'
import type { Stat } from '@/lib/types'

const statusStyle = {
  active: 'bg-[#E3F2D7] text-[#447534]',
  paused: 'bg-[#F8E9B9] text-[#8A6A15]',
  draft: 'bg-black/[0.05] text-muted-foreground dark:bg-white/[0.06]',
}

const DashboardPage = () => {
  const { user } = Route.useRouteContext()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: agents, isLoading: agentsLoading } = useAgents()
  const { canDo } = usePlan()
  const [newAgentOpen, setNewAgentOpen] = useState(false)
  const displayName = user?.email?.split('@')[0] ?? 'there'

  useEffect(() => {
    if (hasSeenTour()) return
    const timeout = setTimeout(() => {
      void startTour()
    }, 600)
    return () => clearTimeout(timeout)
  }, [])

  const statCards: Stat[] = [
    {
      id: 'agents',
      label: 'Active agents',
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
      label: 'Total leads',
      value: formatNumber(stats?.leads ?? 0),
      delta: 0,
      trend: 'up',
      icon: Users,
    },
    {
      id: 'pipeline',
      label: 'Pipeline value',
      value: formatCurrency(stats?.pipeline_value ?? 0),
      delta: 0,
      trend: 'up',
      icon: TrendingUp,
    },
  ]

  return (
    <DashboardShell userEmail={user?.email} userName={displayName}>
      <div className="mx-auto max-w-[1480px]">
        <UsageLimitBanner className="mb-5" />
        <GettingStartedCard />

        <motion.section
          initial={{ opacity: 0.8, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="dashboard-grid relative overflow-hidden rounded-[28px] bg-[#171713] p-6 text-white shadow-[0_28px_70px_rgba(29,23,16,0.16)] sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-36 size-80 rounded-full bg-[#F1663C]/22 blur-[85px]" />
          <div className="pointer-events-none absolute -bottom-44 left-1/3 size-72 rounded-full bg-[#F6BC96]/10 blur-[90px]" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_0.78fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
                <span className="size-1.5 rounded-full bg-[#F1663C]" /> Command center
              </div>
              <h1 className="mt-6 max-w-3xl text-3xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                {getGreeting()}, <span className="capitalize text-[#F49A70]">{displayName}.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/48 sm:text-base sm:leading-7">
                See what needs attention, keep your pipeline moving, and hand
                the repetitive work to your AI team.
              </p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setNewAgentOpen(true)}
                  disabled={!canDo('agents')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F1663C] px-5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Plus className="size-3.5" /> Add an AI agent
                </button>
                <Link
                  to="/chat"
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 text-xs font-semibold text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  Ask Allein anything
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Workspace pulse</span>
                <span className="flex items-center gap-1.5 text-[9px] text-white/30">
                  <Sparkles className="size-3 text-[#F49A70]" /> Live
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'New leads', value: stats?.new_leads ?? 0, icon: Users },
                  { label: 'Open deals', value: stats?.open_deals ?? 0, icon: CircleDollarSign },
                  { label: 'Posts queued', value: stats?.scheduled_posts ?? 0, icon: Sparkles },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-black/18 p-3">
                    <item.icon className="size-3.5 text-[#F49A70]" />
                    <p className="mt-5 text-xl font-semibold tabular-nums">{item.value}</p>
                    <p className="mt-1 text-[8px] leading-3 text-white/30">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[156px] rounded-[22px]" />
              ))
            : statCards.map((stat, index) => <StatCard key={stat.id} stat={stat} index={index} />)}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-7">
            <TodaysBox />

            <section className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-5 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17] sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Your team</p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">AI agents</h2>
                  <p className="mt-1 text-[10px] text-muted-foreground">Specialists working across your practice</p>
                </div>
                <Link to="/agents" className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-[#F1663C]">
                  View all <ArrowUpRight className="size-3" />
                </Link>
              </div>

              <div className="mt-5">
                {agentsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
                  </div>
                ) : agents && agents.length > 0 ? (
                  <ul className="space-y-1.5">
                    {agents.slice(0, 5).map((agent) => (
                      <li key={agent.id} className="group flex items-center gap-3 rounded-xl bg-black/[0.02] px-3 py-2.5 transition-colors hover:bg-white dark:bg-white/[0.025] dark:hover:bg-white/[0.045]">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F8D8C8] text-[#A54528]">
                          <Bot className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{agent.name}</p>
                          <p className="mt-0.5 truncate text-[9px] capitalize text-muted-foreground">
                            {agent.type.replace('_', ' ')} · {agent.conversations_count} conversations
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] ${statusStyle[agent.status as keyof typeof statusStyle] ?? statusStyle.draft}`}>
                          {agent.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyAgents onCreate={() => setNewAgentOpen(true)} disabled={!canDo('agents')} />
                )}
              </div>
            </section>
          </div>

          <div className="space-y-5 xl:col-span-5">
            <QuickActions />
            <ActivityFeed />
            <GoalsDashboardCard />
          </div>
        </div>
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
  head: () => ({ meta: [{ title: 'Command center — Allein' }] }),
  component: DashboardPage,
})
