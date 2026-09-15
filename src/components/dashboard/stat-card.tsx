import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { motion } from '@/lib/animations'
import type { Stat } from '@/lib/types'

const ACCENTS = [
  'bg-[#F8D8C8] text-[#A54528]',
  'bg-[#E3F2D7] text-[#447534]',
  'bg-[#E9D8F5] text-[#734F8D]',
  'bg-[#F8E9B9] text-[#8A6A15]',
]

export const StatCard = ({ stat, index = 0 }: { stat: Stat; index?: number }) => {
  const Icon = stat.icon
  const positive = stat.trend === 'up'
  // Hide the trend indicator when there's no real delta — avoids showing a
  // misleading "+0% vs last month" for stats we don't yet compute trends on.
  const showTrend = stat.delta !== 0 && stat.delta != null

  return (
    <motion.div
      initial={{ opacity: 0.7, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.08,
      }}
    >
      <article className="group min-h-[156px] rounded-[22px] border border-[#171713]/7 bg-[#FCF9F4] p-5 shadow-[0_14px_38px_rgba(35,27,18,0.035)] transition-transform hover:-translate-y-0.5 dark:border-white/[0.07] dark:bg-[#1B1B17]">
        <div className="flex items-start justify-between">
          <div className={cn('flex size-10 items-center justify-center rounded-xl', ACCENTS[index % ACCENTS.length])}>
            <Icon className="size-4" />
          </div>
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Live</span>
        </div>
        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-semibold tracking-[-0.045em] tabular-nums">
            {stat.value}
            </div>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">{stat.label}</p>
          </div>
          {showTrend ? (
            <div className="mb-0.5 flex items-center gap-1 text-[10px]">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-medium',
                  positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                {positive ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {stat.delta}%
              </span>
              <span className="hidden text-muted-foreground xl:inline">this month</span>
            </div>
          ) : null}
        </div>
      </article>
    </motion.div>
  )
}
