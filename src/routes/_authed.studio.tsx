import { Sparkles } from 'lucide-react'
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Create', to: '/studio' },
  { label: 'Planner', to: '/studio/planner' },
  { label: 'Image chat', to: '/studio/chat' },
  { label: 'Library', to: '/studio/library' },
  { label: 'Brand kit', to: '/studio/brand' },
] as const

const StudioLayout = () => {
  const { user } = Route.useRouteContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activePath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.email?.split('@')[0]}
    >
      <PageHeader
        eyebrow="Creative workspace"
        icon={Sparkles}
        title="Marketing Studio"
        description="Create and manage campaign content, generate images, and keep your assets in one place."
      />
      <nav className="app-section-nav mb-7" aria-label="Studio sections">
        {TABS.map((tab) => {
          const isActive = activePath === tab.to ||
            (tab.to !== '/studio' && activePath.startsWith(`${tab.to}/`))
          return (
            <Link key={tab.to} to={tab.to} className={cn(isActive && 'is-active')} data-active={isActive}>
              {tab.label}
            </Link>
          )
        })}
        <span aria-disabled="true" className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
          Video <span className="rounded-full bg-[#F1663C]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#C95735]">Coming soon</span>
        </span>
      </nav>
      <Outlet />
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/studio')({
  component: StudioLayout,
})
