import { useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  MessageSquare,
  Server,
  Settings,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PlanBadge } from '@/components/billing/plan-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PLAN_CONFIGS, PLAN_ORDER, type PlanTier } from '@/lib/plans'
import {
  useAdminStats,
  useAdminUsers,
  useAdminBilling,
  useSystemHealth,
  useUpdateUserRole,
  useUpdateUserPlan,
  useAgentTypeConfigs,
  useUpdateAgentTypeConfig,
  useAdminAnalytics,
} from '@/hooks/use-admin'

const AdminPage = () => {
  const { user } = Route.useRouteContext()

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Shield className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage users, agent configurations, and system settings.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="agents">Agent Config</TabsTrigger>
          <TabsTrigger value="system">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <BillingTab />
        </TabsContent>
        <TabsContent value="agents" className="mt-4">
          <AgentConfigTab />
        </TabsContent>
        <TabsContent value="system" className="mt-4">
          <SystemConfigTab />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw new Error('Not authenticated')
    }
    const { checkAdminAccess } = await import('@/server/admin')
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      throw new Error('Admin access required')
    }
  },
  component: AdminPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <Shield className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Access denied</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message || 'You need admin access to view this page.'}
          </p>
        </CardContent>
      </Card>
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

const OverviewTab = () => {
  const { data: stats, isLoading } = useAdminStats()

  if (isLoading || !stats || 'error' in stats) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Recent Signups', value: stats.recentSignups, icon: TrendingUp, color: 'text-emerald-500', suffix: '/ 7 days' },
    { label: 'Total Agents', value: stats.totalAgents, icon: Bot, color: 'text-violet-500' },
    { label: 'Conversations', value: stats.totalConversations, icon: MessageSquare, color: 'text-amber-500' },
    { label: 'Messages', value: stats.totalMessages, icon: Activity, color: 'text-pink-500' },
    { label: 'Leads', value: stats.totalLeads, icon: Users, color: 'text-cyan-500' },
    { label: 'Posts', value: stats.totalPosts, icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'text-teal-500' },
  ]

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                  <Icon className={cn('size-4', stat.color)} />
                </div>
                <p className="mt-1 text-2xl font-semibold">
                  {formatNumber(stat.value)}
                  {stat.suffix && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      {stat.suffix}
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Users by plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Users by Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PLAN_ORDER.map((tier) => {
              const count = stats.usersByPlan[tier] ?? 0
              const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0
              return (
                <div key={tier} className="flex items-center gap-3">
                  <PlanBadge tier={tier} className="w-16 justify-center" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{count}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PLAN_CONFIGS[tier].accent,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Agents by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Agents by Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.agentsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="capitalize">{type.replace('_', ' ')}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {Object.keys(stats.agentsByType).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No agents created yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

const UsersTab = () => {
  const { data: users, isLoading } = useAdminUsers()
  const updateRole = useUpdateUserRole()
  const updatePlan = useUpdateUserPlan()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    )
  }

  if (!users || 'error' in users) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {users && 'error' in users ? users.error : 'Failed to load users'}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          All Users ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              {/* User info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {u.full_name || u.email.split('@')[0]}
                  </p>
                  <PlanBadge tier={u.plan} />
                  {u.role !== 'member' && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        u.role === 'owner'
                          ? 'border-primary text-primary'
                          : '',
                      )}
                    >
                      {u.role}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · joined {formatDistanceToNow(new Date(u.created_at))}
                </p>
              </div>

              {/* Usage */}
              <div className="hidden gap-4 text-xs text-muted-foreground sm:flex">
                <span>{u.agents_count} agents</span>
                <span>{u.messages_count} msgs</span>
              </div>

              {/* Role selector */}
              <Select
                value={u.role}
                onValueChange={(role) =>
                  updateRole.mutate({ userId: u.id, role: role as 'member' | 'admin' | 'owner' })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>

              {/* Plan selector */}
              <Select
                value={u.plan}
                onValueChange={(plan) =>
                  updatePlan.mutate({ userId: u.id, plan: plan as PlanTier })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_ORDER.map((tier) => (
                    <SelectItem key={tier} value={tier} className="capitalize">
                      {PLAN_CONFIGS[tier].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Agent Config Tab
// ---------------------------------------------------------------------------

const AgentConfigTab = () => {
  const { data: types, isLoading } = useAgentTypeConfigs()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  if (!types || 'error' in types) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {types && 'error' in types ? types.error : 'Failed to load configs'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {types.map((type) => (
        <AgentTypeEditor key={type.key} type={type} />
      ))}
    </div>
  )
}

const AgentTypeEditor = ({
  type,
}: {
  type: import('@/hooks/use-admin').AdminAgentTypeRow
}) => {
  const updateConfig = useUpdateAgentTypeConfig()
  const [label, setLabel] = useState(type.label)
  const [description, setDescription] = useState(type.description ?? '')
  const [systemPrompt, setSystemPrompt] = useState(type.system_prompt)
  const [expanded, setExpanded] = useState(false)

  const handleSave = () => {
    updateConfig.mutate({
      key: type.key,
      label,
      description,
      systemPrompt,
    })
  }

  const toggleActive = () => {
    updateConfig.mutate({
      key: type.key,
      isActive: !type.is_active,
    })
  }

  return (
    <Card className={cn(!type.is_active && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${type.accent_color}20` }}
            >
              <Bot
                className="size-5"
                style={{ color: type.accent_color }}
              />
            </div>
            <div>
              <CardTitle className="text-sm capitalize">{type.key.replace('_', ' ')}</CardTitle>
              <CardDescription className="text-xs">
                {type.is_active ? 'Active' : 'Disabled'}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleActive}
              disabled={updateConfig.isPending}
            >
              {type.is_active ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? 'Collapse' : 'Edit'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border px-3 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">System Prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            Save changes
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Billing Tab
// ---------------------------------------------------------------------------

const BillingTab = () => {
  const { data: billing, isLoading } = useAdminBilling()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  if (!billing || 'error' in billing) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {billing && 'error' in billing ? billing.error : 'Failed to load billing data'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Revenue & trial stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Est. Monthly Revenue</span>
              <DollarSign className="size-4 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">
              ${formatNumber(billing.estimatedMonthlyRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Paying Plans</span>
              <CreditCard className="size-4 text-blue-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {Object.entries(billing.revenueByPlan)
                .filter(([plan]) => plan !== 'free')
                .reduce((sum, [, rev]) => sum + (rev > 0 ? 1 : 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Trial Users</span>
              <Users className="size-4 text-amber-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{billing.trialUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active Subscriptions</span>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {billing.subscriptionsByStatus['active']?.count ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Revenue breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PLAN_ORDER.map((tier) => {
              const rev = billing.revenueByPlan[tier] ?? 0
              const pct = billing.estimatedMonthlyRevenue > 0
                ? Math.round((rev / billing.estimatedMonthlyRevenue) * 100)
                : 0
              return (
                <div key={tier} className="flex items-center gap-3">
                  <PlanBadge tier={tier} className="w-16 justify-center" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">${rev}/mo</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PLAN_CONFIGS[tier].accent,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Subscription status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Subscription Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(billing.subscriptionsByStatus).map(([status, info]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="capitalize">{info.label}</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    status === 'active' && 'bg-emerald-500/10 text-emerald-600',
                    status === 'past_due' && 'bg-red-500/10 text-red-600',
                    status === 'inactive' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {info.count}
                </Badge>
              </div>
            ))}
            {Object.keys(billing.subscriptionsByStatus).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No subscription data
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Platform Usage</CardTitle>
          <CardDescription>Aggregated usage across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold">{formatNumber(billing.totalUsage.agents)}</p>
              <p className="text-xs text-muted-foreground">Total Agents</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">{formatNumber(billing.totalUsage.conversations)}</p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">{formatNumber(billing.totalUsage.messages)}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// System Health Tab
// ---------------------------------------------------------------------------

const SystemConfigTab = () => {
  const { data: health, isLoading } = useSystemHealth()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!health || 'error' in health) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {health && 'error' in health ? health.error : 'Failed to load system health'}
        </CardContent>
      </Card>
    )
  }

  const totalAgents = Object.values(health.agentStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      {/* Status row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Agents</span>
              <Bot className="size-4 text-violet-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{totalAgents}</p>
            <p className="text-xs text-muted-foreground">
              {health.agentStatus['active'] ?? 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Token Usage</span>
              <Activity className="size-4 text-pink-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {formatTokenCount(health.tokenUsage.totalTokens)}
            </p>
            <p className="text-xs text-muted-foreground">
              ~${health.tokenUsage.estimatedCost} estimated cost
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Messages (30d)</span>
              <MessageSquare className="size-4 text-amber-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">
              {formatNumber(health.usageTrend.last30d)}
            </p>
            <p className="text-xs text-muted-foreground">
              {health.usageTrend.last24h} in last 24h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Registered Users</span>
              <Users className="size-4 text-blue-500" />
            </div>
            <p className="mt-1 text-2xl font-semibold">{health.activeUsers}</p>
            <p className="text-xs text-muted-foreground">total accounts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Agent status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bot className="size-4" />
              Agent Status
            </CardTitle>
            <CardDescription>All agents across the platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['active', 'paused', 'draft', 'archived'].map((status) => {
              const count = health.agentStatus[status] ?? 0
              const pct = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0
              return (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium capitalize">{status}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: status === 'active' ? '#10b981' : status === 'paused' ? '#f59e0b' : status === 'draft' ? '#6b7280' : '#94a3b8',
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {totalAgents === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No agents created yet</p>
            )}
          </CardContent>
        </Card>

        {/* Token usage details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="size-4" />
              Token Consumption
            </CardTitle>
            <CardDescription>LLM token usage across all agents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <TokenRow label="Input Tokens" value={health.tokenUsage.tokensIn} color="bg-blue-500" />
            <TokenRow label="Output Tokens" value={health.tokenUsage.tokensOut} color="bg-violet-500" />
            <TokenRow label="Total Tokens" value={health.tokenUsage.totalTokens} color="bg-pink-500" />
            <div className="pt-2 text-center text-xs text-muted-foreground">
              Estimated cost: <span className="font-medium text-foreground">${health.tokenUsage.estimatedCost}</span>
              {' '}(DeepSeek pricing: $0.14/M input, $0.28/M output)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4" />
            Message Volume
          </CardTitle>
          <CardDescription>Messages processed over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <TrendStat label="Last 24 hours" value={health.usageTrend.last24h} />
            <TrendStat label="Last 7 days" value={health.usageTrend.last7d} />
            <TrendStat label="Last 30 days" value={health.usageTrend.last30d} />
          </div>
        </CardContent>
      </Card>

      {/* Recent system logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4" />
            Recent System Activity
          </CardTitle>
          <CardDescription>Latest events across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {health.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                <LogIcon type={log.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{log.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.userEmail.split('@')[0]} · {formatDistanceToNow(new Date(log.createdAt))} ago
                  </p>
                </div>
              </div>
            ))}
            {health.recentLogs.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Infrastructure info (collapsed at bottom) */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          <Settings className="mr-1 inline size-4" />
          Infrastructure &amp; Configuration
        </summary>
        <div className="mt-3 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Server className="size-4" />
                API Integrations
              </CardTitle>
              <CardDescription>Third-party services configured server-side</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <IntegrationRow provider="DeepSeek" description="Primary LLM for agent chat &amp; generation" configured />
              <IntegrationRow provider="OpenAI" description="Image generation (GPT-Image-1)" configured />
              <IntegrationRow provider="Supabase" description="Database, auth, and storage" configured />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings className="size-4" />
                Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <EnvRow label="Framework" value="TanStack Start (React)" />
              <EnvRow label="Database" value="Supabase (PostgreSQL)" />
              <EnvRow label="Auth" value="Supabase Auth (SSR cookies)" />
              <EnvRow label="LLM Provider" value="DeepSeek" />
              <EnvRow label="Image Gen" value="OpenAI GPT-Image-1" />
            </CardContent>
          </Card>
        </div>
      </details>
    </div>
  )
}

const TokenRow = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const maxVal = 100_000_000
  const pct = Math.min((value / maxVal) * 100, 100)
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{formatTokenCount(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const TrendStat = ({ label, value }: { label: string; value: number }) => {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

const LogIcon = ({ type }: { type: string }) => {
  const config: Record<string, { icon: typeof Bot; color: string }> = {
    agent_created: { icon: Bot, color: 'text-violet-500 bg-violet-500/10' },
    conversation: { icon: MessageSquare, color: 'text-amber-500 bg-amber-500/10' },
    lead_captured: { icon: Users, color: 'text-cyan-500 bg-cyan-500/10' },
    user_joined: { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-500/10' },
    message: { icon: Activity, color: 'text-pink-500 bg-pink-500/10' },
  }
  const c = config[type] ?? { icon: Activity, color: 'bg-muted text-muted-foreground' }
  const Icon = c.icon
  return (
    <div className={`flex size-8 items-center justify-center rounded-md ${c.color}`}>
      <Icon className="size-4" />
    </div>
  )
}

const IntegrationRow = ({
  provider,
  description,
  configured,
}: {
  provider: string
  description: string
  configured: boolean
}) => {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="font-medium">{provider}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
          configured
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400',
        )}
      >
        {configured ? (
          <CheckCircle2 className="size-3" />
        ) : (
          <XCircle className="size-3" />
        )}
        {configured ? 'Active' : 'Missing'}
      </span>
    </div>
  )
}

const EnvRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Platform-wide Analytics Tab
// ---------------------------------------------------------------------------

const AnalyticsTab = () => {
  const { data: trends, isLoading } = useAdminAnalytics()

  if (isLoading) {
    return (
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
    )
  }

  const data = trends && !('error' in trends) ? trends : null
  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No analytics data available yet.
        </CardContent>
      </Card>
    )
  }

  const statCards = [
    { label: 'Total Users', value: data.totalUsers, growth: data.growth.users, icon: Users, color: 'text-blue-500' },
    { label: 'Total Agents', value: data.totalAgents, growth: data.growth.agents, icon: Bot, color: 'text-violet-500' },
    { label: 'Conversations', value: data.totalConversations, growth: data.growth.conversations, icon: MessageSquare, color: 'text-amber-500' },
    { label: 'Leads', value: data.totalLeads, growth: data.growth.leads, icon: TrendingUp, color: 'text-cyan-500' },
  ]

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <Icon className={cn('size-5', stat.color)} />
                  <GrowthBadge growth={stat.growth} />
                </div>
                <p className="mt-2 text-2xl font-bold">{formatNumber(stat.value)}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Growth overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Growth Overview</CardTitle>
          <CardDescription>Week-over-week comparison</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Users', value: data.growth.users, icon: Users, color: 'text-blue-500' },
            { label: 'Agents', value: data.growth.agents, icon: Bot, color: 'text-violet-500' },
            { label: 'Conversations', value: data.growth.conversations, icon: MessageSquare, color: 'text-amber-500' },
            { label: 'Messages', value: data.growth.messages, icon: MessageSquare, color: 'text-pink-500' },
            { label: 'Leads', value: data.growth.leads, icon: TrendingUp, color: 'text-cyan-500' },
          ].map((m) => {
            const Icon = m.icon
            const pct = Math.min(Math.abs(m.value), 100)
            return (
              <div key={m.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('size-4', m.color)} />
                    <span>{m.label}</span>
                  </div>
                  <GrowthBadge growth={m.value} />
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

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">All-Time Totals</CardTitle>
          <CardDescription>Platform-wide summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Active Agents', value: formatNumber(data.activeAgents), sub: `of ${formatNumber(data.totalAgents)} total` },
              { label: 'Messages', value: formatNumber(data.totalMessages), sub: 'all time' },
              { label: 'Deals', value: formatNumber(data.totalDeals), sub: `$${formatNumber(data.pipelineValue)} pipeline` },
              { label: 'Posts', value: formatNumber(data.totalPosts), sub: 'scheduled & published' },
              { label: 'Documents', value: formatNumber(data.totalDocuments), sub: 'knowledge base' },
            ].map((r) => (
              <div key={r.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="mt-0.5 text-xl font-semibold">{r.value}</p>
                <p className="text-xs text-muted-foreground">{r.sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const GrowthBadge = ({ growth }: { growth: number }) => {
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

const formatTokenCount = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
