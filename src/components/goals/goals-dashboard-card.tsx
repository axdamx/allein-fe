import { ArrowUpRight, Plus, Target } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { useFinancialGoals } from '@/hooks/use-financial-goals'
import { getTimeframeLabel } from '@/server/financial-goals'
import { motion } from '@/lib/animations'

export const GoalsDashboardCard = () => {
  const { data: goals, isLoading } = useFinancialGoals()
  const activeGoals = goals && !('error' in goals) ? goals.filter((goal) => goal.status === 'active') : []

  if (isLoading) {
    return (
      <section className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-6 dark:border-white/[0.07] dark:bg-[#1B1B17]">
        <Skeleton className="h-4 w-32" />
        <div className="mt-6 space-y-5">
          {Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-14 w-full rounded-xl" />)}
        </div>
      </section>
    )
  }

  if (activeGoals.length === 0) {
    return (
      <section className="flex min-h-[250px] flex-col justify-between rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-6 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Direction</p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">Financial goals</h2>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#F8E9B9] text-[#8A6A15]">
            <Target className="size-4" />
          </span>
        </div>
        <div className="py-5">
          <p className="text-sm font-semibold">Give the work a destination.</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Set a target and see progress alongside your daily activity.</p>
        </div>
        <Link to="/goals" className="inline-flex items-center gap-2 text-xs font-semibold text-[#F1663C]">
          <Plus className="size-3.5" /> Set your first goal
        </Link>
      </section>
    )
  }

  const sorted = [...activeGoals].sort(
    (a, b) => a.current_amount / a.target_amount - b.current_amount / b.target_amount,
  )

  return (
    <motion.section
      initial={{ opacity: 0.7, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-5 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Direction</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">Financial goals</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">{activeGoals.length} active target{activeGoals.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/goals" className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-[#F1663C]">
          View all <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        {sorted.slice(0, 3).map((goal) => {
          const percentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
          return (
            <div key={goal.id}>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{goal.title}</p>
                  <p className="mt-1 text-[9px] text-muted-foreground">{getTimeframeLabel(goal.timeframe)}</p>
                </div>
                <span className="text-xs font-semibold tabular-nums">{percentage}%</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
                <div className="h-full rounded-full bg-[#F1663C] transition-[width]" style={{ width: `${percentage}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
                <span>RM{goal.current_amount.toLocaleString()}</span>
                <span>RM{goal.target_amount.toLocaleString()}</span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}
