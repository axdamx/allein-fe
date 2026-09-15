import { ArrowRight, CalendarDays, Check } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { isPast, parseISO } from 'date-fns'

import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useTodaysLeads, useUpdateLead } from '@/hooks/use-crm'
import { motion } from '@/lib/animations'
import { cn } from '@/lib/utils'

export const TodaysBox = () => {
  const { data: todaysLeads, isLoading } = useTodaysLeads()
  const updateLead = useUpdateLead()

  if (isLoading) {
    return (
      <section className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-6 dark:border-white/[0.07] dark:bg-[#1B1B17]">
        <Skeleton className="h-4 w-32" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-xl" />)}
        </div>
      </section>
    )
  }

  if (!todaysLeads || todaysLeads.length === 0) {
    return (
      <section className="flex min-h-[250px] flex-col justify-between rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-6 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Today</p>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">Your focus list</h2>
          </div>
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#E3F2D7] text-[#447534]">
            <Check className="size-4" />
          </span>
        </div>
        <div className="py-5">
          <p className="text-sm font-semibold">You&apos;re clear for today.</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            No lead follow-ups are scheduled. Use the planner to shape your next priority.
          </p>
        </div>
        <Link to="/planner" className="inline-flex items-center gap-2 text-xs font-semibold text-[#F1663C]">
          Open planner <ArrowRight className="size-3.5" />
        </Link>
      </section>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0.7, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
      className="rounded-[24px] border border-[#171713]/7 bg-[#FCF9F4] p-5 shadow-[0_16px_45px_rgba(35,27,18,0.04)] dark:border-white/[0.07] dark:bg-[#1B1B17] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Today</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.025em]">Your focus list</h2>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {todaysLeads.length} client follow-up{todaysLeads.length === 1 ? '' : 's'} need attention
          </p>
        </div>
        <Link
          to="/crm/leads"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-[#F1663C]"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="mt-5 space-y-1.5">
        {todaysLeads.slice(0, 5).map((lead) => {
          const isOverdue =
            Boolean(lead.scheduled_date) &&
            isPast(parseISO(lead.scheduled_date!)) &&
            lead.scheduled_date !== new Date().toISOString().split('T')[0]

          return (
            <div
              key={lead.id}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-transparent bg-black/[0.02] px-3 py-2.5 transition-colors hover:border-black/[0.05] hover:bg-white dark:bg-white/[0.025] dark:hover:border-white/[0.06] dark:hover:bg-white/[0.045]',
                isOverdue && 'border-l-[#F1663C]',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-xl',
                  isOverdue ? 'bg-[#F8D8C8] text-[#A54528]' : 'bg-[#E9DCCB] text-[#5F5142]',
                )}
              >
                <CalendarDays className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  to="/crm/leads/$leadId"
                  params={{ leadId: lead.id }}
                  className="block truncate text-xs font-semibold hover:underline"
                >
                  {lead.name}
                </Link>
                <p className="mt-0.5 truncate text-[9px] capitalize text-muted-foreground">
                  {lead.company ? `${lead.company} · ` : ''}{lead.status.replace('_', ' ')}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full px-2.5 text-[10px] text-muted-foreground hover:bg-[#E3F2D7] hover:text-[#447534]"
                disabled={updateLead.isPending}
                onClick={() => updateLead.mutate({ id: lead.id, scheduled_date: null })}
              >
                <Check className="size-3" /> Done
              </Button>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}
