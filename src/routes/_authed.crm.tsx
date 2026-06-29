import { Outlet, Link, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { FeatureGate } from '@/components/billing/feature-gate'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Leads', to: '/crm/leads' },
  { label: 'Pipeline', to: '/crm/pipeline' },
  { label: 'Clients', to: '/crm/clients' },
]

const CrmLayout = () => {
  const { user } = Route.useRouteContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <FeatureGate feature="crm">
      <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
        <div className="mb-4 flex gap-1 border-b">
          {TABS.map((tab) => {
            const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-b-2 border-primary'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
        <Outlet />
      </DashboardShell>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/_authed/crm')({
  component: CrmLayout,
})
