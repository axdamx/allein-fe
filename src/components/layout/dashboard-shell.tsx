import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { usePlan } from '@/hooks/use-plan'

export function DashboardShell({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode
  userEmail?: string | null
  userName?: string | null
}) {
  const { tier } = usePlan()

  return (
    <div className="flex min-h-svh bg-muted/30">
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        userPlan={tier}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
