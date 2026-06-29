import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { GoalsFab } from '@/components/goals/goals-fab'
import { usePlan } from '@/hooks/use-plan'
import { useAgentTypes } from '@/hooks/use-agents'
import { getProfile } from '@/server/settings'
import { motion } from '@/lib/animations'

export const DashboardShell = ({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode
  userEmail?: string | null
  userName?: string | null
}) => {
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
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          {children}
        </motion.main>
      </div>
      <GoalsFab />
    </div>
  )
}
