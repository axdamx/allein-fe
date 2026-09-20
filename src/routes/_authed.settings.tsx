import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2, Settings2 } from 'lucide-react'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ApiTab } from '@/components/settings/api-tab'
import { IntegrationsTab } from '@/components/settings/integrations-tab'
import { PlanTab } from '@/components/settings/plan-tab'
import { ProfileTab } from '@/components/settings/profile-tab'
import { SubscriptionSuccessModal } from '@/components/billing/subscription-success-modal'
import { getProfile } from '@/server/settings'

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const { billing } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
  })

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <PageHeader
        eyebrow="Workspace control"
        icon={Settings2}
        title="Settings"
        description="Manage your identity, subscription, connected channels, and developer access."
      />

      {isLoading || !profile ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={billing ? 'plan' : 'profile'} className="max-w-3xl">
          <TabsList className="max-w-full overflow-x-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="plan">Plan &amp; Billing</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab profile={profile} />
          </TabsContent>
          <TabsContent value="plan">
            <PlanTab currentPlan={profile.plan} />
          </TabsContent>
          <TabsContent value="integrations">
            <IntegrationsTab profile={profile} />
          </TabsContent>
          <TabsContent value="api">
            <ApiTab />
          </TabsContent>
        </Tabs>
      )}

      <SubscriptionSuccessModal
        checkoutReturn={billing}
        onDismiss={() => {
          void navigate({ to: '/settings', search: {}, replace: true })
        }}
      />
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/settings')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { billing?: 'success' | 'canceled' } => ({
    billing:
      search.billing === 'success' || search.billing === 'canceled'
        ? search.billing
        : undefined,
  }),
  component: SettingsPage,
})
