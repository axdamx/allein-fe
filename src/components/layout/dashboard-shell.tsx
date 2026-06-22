import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { usePlan } from '@/hooks/use-plan'
import { useAgentTypes } from '@/hooks/use-agents'
import { getProfile } from '@/server/settings'

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
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    staleTime: 5 * 60 * 1000,
  })
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner'

  const { data: agentTypes } = useAgentTypes()
  const agentTypeInfo = agentTypes?.find((t) => t.key === profile?.agent_type)

  return (
    <div className="flex min-h-svh bg-muted/30">
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        userPlan={tier}
        isAdmin={isAdmin}
        agentType={agentTypeInfo ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
