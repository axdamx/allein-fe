import { Plus } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { AgentsTable } from '@/components/dashboard/agents-table'
import { ConversationsPanel } from '@/components/dashboard/conversations-panel'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrafficChart } from '@/components/dashboard/traffic-chart'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import { stats } from '@/data/mock'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useRouteContext()
  return (
    <DashboardShell userEmail={user?.email}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage your AI agents.
          </p>
        </div>
        <Button>
          <Plus className="size-4" /> New Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrafficChart />
        <ActivityFeed />
        <AgentsTable />
        <ConversationsPanel />
      </div>
    </DashboardShell>
  )
}
