import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PlanBadge } from '@/components/billing/plan-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  PLAN_CONFIGS,
  PLAN_ORDER,
  isHigherTier,
  type PlanTier,
} from '@/lib/plans'
import {
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { getProfile, updateProfile, updatePlan } from '@/server/settings'
import { useAgentTypes } from '@/hooks/use-agents'
import { getLucideIcon } from '@/lib/icons'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  })

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, plan, and integrations.
        </p>
      </div>

      {isLoading || !profile ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="profile" className="max-w-2xl">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="plan">Plan &amp; Billing</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab profile={profile} />
          </TabsContent>
          <TabsContent value="plan">
            <PlanTab currentPlan={profile.plan} />
          </TabsContent>
          <TabsContent value="api">
            <ApiTab />
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  )
}

function ProfileTab({
  profile,
}: {
  profile: {
    full_name: string | null
    company: string | null
    phone: string | null
    email: string
    agent_type: string | null
  }
}) {
  const qc = useQueryClient()
  const { data: agentTypes } = useAgentTypes()
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [company, setCompany] = useState(profile.company ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')

  const agentTypeInfo = agentTypes?.find((t) => t.key === profile.agent_type)

  const mutation = useMutation({
    mutationFn: (data: {
      fullName?: string
      company?: string
      phone?: string
    }) => updateProfile({ data }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Profile updated')
        qc.invalidateQueries({ queryKey: ['profile'] })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ fullName, company, phone })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          {profile.agent_type && agentTypeInfo && (
            <AgentTypeField typeInfo={agentTypeInfo} />
          )}
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function AgentTypeField({
  typeInfo,
}: {
  typeInfo: {
    key: string
    label: string
    description: string | null
    icon: string | null
    accent_color: string
  }
}) {
  const Icon = getLucideIcon(typeInfo.icon)
  return (
    <div className="space-y-2">
      <Label>Agent Type</Label>
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        style={{ borderColor: `${typeInfo.accent_color}30` }}
      >
        <div
          className="flex size-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${typeInfo.accent_color}20` }}
        >
          <Icon className="size-5" style={{ color: typeInfo.accent_color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{typeInfo.label}</p>
          <p className="text-xs text-muted-foreground">
            {typeInfo.description}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Locked</span>
      </div>
    </div>
  )
}

function PlanTab({ currentPlan }: { currentPlan: PlanTier }) {
  const qc = useQueryClient()

  const changePlan = useMutation({
    mutationFn: (plan: PlanTier) => updatePlan({ data: { plan } }),
    onSuccess: (result, plan) => {
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Switched to ${PLAN_CONFIGS[plan].label} plan`)
        qc.invalidateQueries({ queryKey: ['profile'] })
        qc.invalidateQueries({ queryKey: ['plan-state'] })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan &amp; Billing</CardTitle>
        <CardDescription>
          You're currently on the{' '}
          <PlanBadge tier={currentPlan} /> plan. Real billing integration ships
          in Phase 7 — for now you can switch plans to test gating.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {PLAN_ORDER.map((tier) => {
          const cfg = PLAN_CONFIGS[tier]
          const isCurrent = tier === currentPlan
          const isUpgrade = isHigherTier(currentPlan, tier)
          return (
            <div
              key={tier}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3',
                isCurrent && 'border-primary bg-primary/5',
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{cfg.label}</p>
                  {isCurrent && <PlanBadge tier={tier} />}
                </div>
                <p className="text-xs text-muted-foreground">{cfg.tagline}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {cfg.price === null
                    ? 'Custom'
                    : cfg.price === 0
                      ? 'Free'
                      : `$${cfg.price}/mo`}
                </p>
                <Button
                  size="sm"
                  variant={isCurrent ? 'outline' : isUpgrade ? 'default' : 'outline'}
                  disabled={isCurrent || changePlan.isPending}
                  onClick={() => changePlan.mutate(tier)}
                  className="mt-1"
                >
                  {isCurrent ? 'Current' : isUpgrade ? 'Upgrade' : 'Switch'}
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function ApiTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Keys</CardTitle>
        <CardDescription>
          These keys are configured server-side and used for AI generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <KeyRow
          label="DeepSeek"
          description="Primary LLM for agent chat"
          status="configured"
        />
        <KeyRow
          label="OpenAI"
          description="Image generation (GPT-Image-1)"
          status="configured"
        />
        <p className="pt-2 text-xs text-muted-foreground">
          API keys are stored in <code className="rounded bg-muted px-1">.env</code>{' '}
          and never exposed to the client. Manage them in your deployment
          environment.
        </p>
      </CardContent>
    </Card>
  )
}

function KeyRow({
  label,
  description,
  status,
}: {
  label: string
  description: string
  status: 'configured' | 'missing'
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
          status === 'configured'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            status === 'configured' ? 'bg-emerald-500' : 'bg-red-500',
          )}
        />
        {status === 'configured' ? 'Active' : 'Missing'}
      </span>
    </div>
  )
}
