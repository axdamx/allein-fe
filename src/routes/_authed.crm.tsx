import { Outlet, Link, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
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
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <PageHeader
        eyebrow="Relationships"
        title="CRM workspace"
        description="Move prospects from first contact to trusted client with every follow-up in one place."
      />
      <nav className="app-section-nav mb-7" aria-label="CRM sections">
        {TABS.map((tab) => {
          const isActive = pathname === tab.to || pathname.startsWith(tab.to + '/')
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                isActive && 'is-active',
              )}
              data-active={isActive}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/crm')({
  component: CrmLayout,
})
