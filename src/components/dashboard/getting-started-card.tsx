'use client'

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Bot, Check, FileText, MessageSquare, Sparkles, Users, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAgents } from '@/hooks/use-agents'
import { useConversations } from '@/hooks/use-chat'
import { useLeads } from '@/hooks/use-crm'
import { useDashboardStats } from '@/hooks/use-dashboard'
import { startTour, hasSeenTour } from '@/components/onboarding/product-tour'

const DISMISS_KEY = 'allein:getting-started-dismissed'

interface Step {
  icon: typeof Bot
  label: string
  to: string
  done: boolean
  isTour?: boolean
}

export const GettingStartedCard = () => {
  const { data: agents } = useAgents()
  const { data: conversations } = useConversations()
  const { data: leads } = useLeads()
  const { data: stats } = useDashboardStats()
  const [dismissed, setDismissed] = useState(true)
  const [tourDone, setTourDone] = useState(true)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    setTourDone(hasSeenTour())
  }, [])

  const steps: Step[] = [
    { icon: Bot, label: 'Create an agent', to: '/agents', done: (agents?.length ?? 0) > 0 },
    { icon: MessageSquare, label: 'Start a conversation', to: '/chat', done: (conversations?.length ?? 0) > 0 },
    { icon: Users, label: 'Add your first lead', to: '/crm/leads', done: (leads?.length ?? 0) > 0 },
    { icon: FileText, label: 'Upload knowledge', to: '/knowledge-base', done: (stats?.documents ?? 0) > 0 },
    { icon: Sparkles, label: 'Take the product tour', to: '#', done: tourDone, isTour: true },
  ]

  const completed = steps.filter((step) => step.done).length
  if (dismissed || completed === steps.length) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleTour = async (event: React.MouseEvent) => {
    event.preventDefault()
    await startTour({ force: true })
    setTourDone(true)
  }

  return (
    <section
      data-tour="getting-started"
      className="relative mb-5 overflow-hidden rounded-[22px] border border-[#F1663C]/18 bg-[#F7DED1] dark:border-[#F1663C]/22 dark:bg-[#47251C]"
    >
      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-[190px] items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#F1663C] text-white">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Set up your workspace</h2>
            <p className="mt-0.5 text-[10px] text-[#171713]/45 dark:text-white/45">{completed} of {steps.length} complete</p>
          </div>
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map((step) => {
            const Icon = step.icon
            const content = (
              <div
                className={cn(
                  'group flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 text-[10px] font-medium transition-colors',
                  step.done
                    ? 'border-transparent bg-white/35 text-[#171713]/38 line-through dark:bg-white/[0.06] dark:text-white/38'
                    : 'border-[#171713]/7 bg-white/55 hover:bg-white dark:border-white/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/10',
                )}
              >
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-lg', step.done ? 'bg-[#5D984A] text-white' : 'bg-[#171713] text-white dark:bg-[#F1663C]')}>
                  {step.done ? <Check className="size-3" /> : <Icon className="size-3" />}
                </span>
                <span className="min-w-0 flex-1 leading-4">{step.label}</span>
                {!step.done ? <ArrowUpRight className="size-3 opacity-25 group-hover:opacity-70" /> : null}
              </div>
            )

            return step.isTour ? (
              <a key={step.label} href="#" onClick={handleTour}>{content}</a>
            ) : (
              <Link key={step.label} to={step.to}>{content}</Link>
            )
          })}
        </div>

        <button
          type="button"
          aria-label="Dismiss getting started"
          onClick={handleDismiss}
          className="absolute right-5 top-5 flex size-7 items-center justify-center rounded-full text-[#171713]/35 hover:bg-black/5 hover:text-[#171713] dark:text-white/35 dark:hover:bg-white/5 dark:hover:text-white lg:static"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="h-1 bg-black/[0.05] dark:bg-white/[0.05]">
        <div className="h-full rounded-r-full bg-[#F1663C] transition-[width]" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
    </section>
  )
}
