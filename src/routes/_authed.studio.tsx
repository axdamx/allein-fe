import { Outlet, Link, createFileRoute, useRouterState } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Marketing Studio
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate content, images, and video with AI — by form or by chat.
        </p>
      </div>

      <div className="mb-4 flex gap-1 border-b">
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
  )
}

export const Route = createFileRoute('/_authed/studio')({
  component: StudioLayout,
})
