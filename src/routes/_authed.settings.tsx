import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

import { DashboardShell } from '@/components/layout/dashboard-shell'
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
import { getProfile } from '@/server/settings'

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
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})
