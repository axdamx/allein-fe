import {
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Bot,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAnalyticsTrends, type AnalyticsTrends } from '@/hooks/use-analytics'
import { useRecentActivity } from '@/hooks/use-dashboard'
import { cn } from '@/lib/utils'
import type { Stat } from '@/lib/types'

export const Route = createFileRoute('/_authed/analytics')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { user } = Route.useRouteContext()
  const { data: trends, isLoading } = useAnalyticsTrends()

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Overview of your platform performance and growth.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      ) : trends ? (
        <AnalyticsContent trends={trends} />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No analytics data available yet.
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  )
}

function AnalyticsContent({ trends }: { trends: AnalyticsTrends }) {
  const statCards: Stat[] = [
    {
      id: 'agents',
      label: 'Total Agents',
      value: String(trends.totalAgents),
      delta: trends.growth.agents,
      trend: trends.growth.agents >= 0 ? 'up' : 'down',
      icon: Bot,
    },
    {
      id: 'conversations',
      label: 'Conversations',
      value: formatNumber(trends.totalConversations),
      delta: trends.growth.conversations,
      trend: trends.growth.conversations >= 0 ? 'up' : 'down',
      icon: MessageSquare,
    },
    {
      id: 'leads',
      label: 'Leads',
      value: String(trends.totalLeads),
      delta: trends.growth.leads,
      trend: trends.growth.leads >= 0 ? 'up' : 'down',
      icon: Users,
    },
    {
      id: 'pipeline',
      label: 'Pipeline Value',
      value: formatCurrency(trends.pipelineValue),
      delta: 0,
      trend: 'up',
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GrowthCard trends={trends} />
        <ActivityCard />
      </div>

      <SummaryCard trends={trends} />
    </div>
  )
}

function GrowthCard({ trends }: { trends: AnalyticsTrends }) {
  const metrics: {
    label: string
    value: number
    growth: number
    icon: typeof Bot
    color: string
  }[] = [
    { label: 'Agents', value: trends.totalAgents, growth: trends.growth.agents, icon: Bot, color: 'text-violet-500' },
    { label: 'Conversations', value: trends.totalConversations, growth: trends.growth.conversations, icon: MessageSquare, color: 'text-amber-500' },
    { label: 'Messages', value: trends.totalMessages, growth: trends.growth.messages, icon: MessageSquare, color: 'text-pink-500' },
    { label: 'Leads', value: trends.totalLeads, growth: trends.growth.leads, icon: Users, color: 'text-cyan-500' },
    { label: 'Documents', value: trends.totalDocuments, growth: 0, icon: FileText, color: 'text-teal-500' },
  ]

  const maxValue = Math.max(...metrics.map((m) => m.value), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Growth Overview</CardTitle>
        <CardDescription>Week-over-week comparison</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((m) => {
          const Icon = m.icon
          const pct = Math.round((m.value / maxValue) * 100)
          return (
            <div key={m.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Icon className={cn('size-4', m.color)} />
                  <span>{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatNumber(m.value)}</span>
                  <GrowthBadge growth={m.growth} />
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all', m.color.replace('text-', 'bg-'))}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function ActivityCard() {
  const { data: activities, isLoading } = useRecentActivity()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Activity</CardTitle>
        <CardDescription>Latest actions across your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <ActivityIcon type={a.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.subtitle} · {formatDistanceToNow(new Date(a.created_at))} ago
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent activity
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, typeof Bot> = {
    agent: Bot,
    lead: Users,
    conversation: MessageSquare,
    post: TrendingUp,
  }
  const Icon = icons[type] ?? Bot
  const colors: Record<string, string> = {
    agent: 'bg-violet-500/10 text-violet-500',
    lead: 'bg-cyan-500/10 text-cyan-500',
    conversation: 'bg-amber-500/10 text-amber-500',
    post: 'bg-emerald-500/10 text-emerald-500',
  }
  return (
    <div className={cn('flex size-8 items-center justify-center rounded-md', colors[type] ?? 'bg-muted text-muted-foreground')}>
      <Icon className="size-4" />
    </div>
  )
}

function SummaryCard({ trends }: { trends: AnalyticsTrends }) {
  const rows: { label: string; value: string; sub: string }[] = [
    { label: 'Active Agents', value: String(trends.activeAgents), sub: `of ${trends.totalAgents} total` },
    { label: 'Total Messages', value: formatNumber(trends.totalMessages), sub: 'all time' },
    { label: 'Total Deals', value: String(trends.totalDeals), sub: `${formatCurrency(trends.pipelineValue)} pipeline` },
    { label: 'Posts Created', value: String(trends.totalPosts), sub: 'scheduled & published' },
    { label: 'Documents', value: String(trends.totalDocuments), sub: 'knowledge base entries' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Summary</CardTitle>
        <CardDescription>All-time totals and current state</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {rows.map((r) => (
            <div key={r.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="mt-0.5 text-xl font-semibold">{r.value}</p>
              <p className="text-xs text-muted-foreground">{r.sub}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function GrowthBadge({ growth }: { growth: number }) {
  if (growth === 0) return null
  const isUp = growth > 0
  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-0.5 text-xs',
        isUp
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400',
      )}
    >
      {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(growth)}%
    </Badge>
  )
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
