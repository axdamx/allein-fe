import { Outlet, Link, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
import { cn } from '@/lib/utils'

/**
 * Studio layout — tabs between the content generator, the conversational
 * image/video chat, and the asset library.
 */
const TABS = [
  { label: 'Create', to: '/studio' },
  { label: 'Chat', to: '/studio/chat' },
  { label: 'Storyboard', to: '/studio/storyboard' },
  { label: 'Library', to: '/studio/library' },
]

const StudioLayout = () => {
  const { user } = Route.useRouteContext()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.email?.split('@')[0]}
    >
      <PageHeader
        eyebrow="Creative workspace"
        title="Marketing Studio"
        description="Turn a simple brief into polished campaigns, visuals, and storyboards with your AI creative team."
      />

      <nav className="app-section-nav mb-7" aria-label="Studio sections">
        {TABS.map((tab) => {
          const isActive =
            tab.to === '/studio'
              ? pathname === '/studio'
              : pathname === tab.to || pathname.startsWith(tab.to + '/')
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

export const Route = createFileRoute('/_authed/studio')({
  component: StudioLayout,
})
