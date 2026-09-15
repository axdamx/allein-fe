import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
// GoalsFab temporarily hidden — re-enable when goals feature ships.
// import { GoalsFab } from '@/components/goals/goals-fab'
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
    <div className="allein-app-shell flex min-h-svh bg-[#F3EEE7] text-[#171713] dark:bg-[#10100D] dark:text-[#F7F2EA]">
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        userPlan={tier}
        isAdmin={isAdmin}
        agentType={agentTypeInfo ?? null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userEmail={userEmail}
          userName={userName}
          userPlan={tier}
          isAdmin={isAdmin}
          agentType={agentTypeInfo ?? null}
        />
        <motion.main
          initial={{ opacity: 0.75, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 overflow-y-auto px-4 pb-8 pt-3 sm:px-6 lg:px-8 lg:pb-10 lg:pt-4"
        >
          {children}
        </motion.main>
      </div>
      {/* Hidden for now — will re-enable once goals feature is ready.
      <GoalsFab /> */}
    </div>
  )
}
