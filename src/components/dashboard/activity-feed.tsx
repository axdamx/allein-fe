import { formatDistanceToNow } from 'date-fns'
import { Bot, MessageSquare, Sparkles, UserRoundPlus } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { useRecentActivity, type RecentActivity } from '@/hooks/use-dashboard'

const activityMeta = {
  agent: { icon: Bot, color: 'bg-[#E9D8F5] text-[#734F8D]' },
  lead: { icon: UserRoundPlus, color: 'bg-[#E3F2D7] text-[#447534]' },
  conversation: { icon: MessageSquare, color: 'bg-[#F8D8C8] text-[#A54528]' },
  post: { icon: Sparkles, color: 'bg-[#F8E9B9] text-[#8A6A15]' },
} satisfies Record<RecentActivity['type'], { icon: typeof Bot; color: string }>

const ActivityLink = ({ activity }: { activity: RecentActivity }) => {
  const content = (
    <>
      <span className="truncate text-xs font-semibold text-[#171713] dark:text-white">{activity.title}</span>
      <span className="mt-0.5 block truncate text-[10px] text-[#171713]/38 dark:text-white/38">
        {activity.subtitle}
      </span>
    </>
  )

  if (activity.type === 'lead') {
    return (
      <Link to="/crm/leads/$leadId" params={{ leadId: activity.id }} className="min-w-0 flex-1 hover:underline">
        {content}
      </Link>
    )
  }
  if (activity.type === 'agent') {
    return (
      <Link to="/agents" className="min-w-0 flex-1 hover:underline">
        {content}
      </Link>
    )
  }
  if (activity.type === 'conversation') {
    return (
      <Link to="/chat" className="min-w-0 flex-1 hover:underline">
        {content}
      </Link>
    )
  }
  return (
    <Link to="/studio/planner" className="min-w-0 flex-1 hover:underline">
      {content}
    </Link>
  )
}

export const ActivityFeed = () => {
  const { data: activities, isLoading } = useRecentActivity()

  return (
    <section className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-5 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Live signal</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">Recent activity</h2>
        </div>
        <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-50" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-5 space-y-1">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
              </div>
            ))
          : activities && activities.length > 0
            ? activities.map((activity) => {
                const meta = activityMeta[activity.type]
                const Icon = meta.icon
                return (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.035]"
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                      <Icon className="size-4" />
                    </span>
                    <ActivityLink activity={activity} />
                    <span className="shrink-0 text-[9px] text-[#171713]/28 dark:text-white/28">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )
              })
            : (
                <div className="rounded-2xl border border-dashed border-[#171713]/10 px-5 py-10 text-center dark:border-white/10">
                  <p className="text-xs font-medium">Your activity will appear here</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Create an agent or add a lead to get moving.</p>
                </div>
              )}
      </div>
    </section>
  )
}
