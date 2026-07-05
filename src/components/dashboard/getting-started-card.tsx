'use client'

import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Bot, Check, FileText, MessageSquare, Sparkles, Users, X } from 'lucide-react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
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
  /** "Take the tour" triggers the tour instead of navigating. */
  isTour?: boolean
}

/**
 * Dismissible "Getting started" checklist, shown at the top of the dashboard
 * for users who haven't completed the basics yet. Completion is derived from
 * real data (no new DB columns) — each step checks whether the corresponding
 * entity exists.
 */
export const GettingStartedCard = () => {
  const { data: agents } = useAgents()
  const { data: conversations } = useConversations()
  const { data: leads } = useLeads()
  const { data: stats } = useDashboardStats()

  const [dismissed, setDismissed] = useState(true)
  const [tourDone, setTourDone] = useState(true)

  // Read localStorage on the client only (avoids SSR hydration mismatch).
  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    setTourDone(hasSeenTour())
  }, [])

  const steps: Step[] = [
    {
      icon: Bot,
      label: 'Create your first agent',
      to: '/agents',
      done: (agents?.length ?? 0) > 0,
    },
    {
      icon: MessageSquare,
      label: 'Start a conversation',
      to: '/chat',
      done: (conversations?.length ?? 0) > 0,
    },
    {
      icon: Users,
      label: 'Add your first lead',
      to: '/crm/leads',
      done: (leads?.length ?? 0) > 0,
    },
    {
      icon: FileText,
      label: 'Upload a document',
      to: '/knowledge-base',
      done: (stats?.documents ?? 0) > 0,
    },
    {
      icon: Sparkles,
      label: 'Take the product tour',
      to: '#',
      done: tourDone,
      isTour: true,
    },
  ]

  const completed = steps.filter((s) => s.done).length
  const allDone = completed === steps.length

  // Auto-hide once everything is complete or the user dismissed it.
  if (dismissed || allDone) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleTour = async (e: React.MouseEvent) => {
    e.preventDefault()
    await startTour({ force: true })
    setTourDone(true)
  }

  return (
    <Card data-tour="getting-started" className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Getting started</CardTitle>
          <p className="text-xs text-muted-foreground">
            {completed} of {steps.length} complete
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss getting started"
          onClick={handleDismiss}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <Progress value={(completed / steps.length) * 100} className="mb-4 h-1.5" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step) => {
            const Icon = step.icon
            const inner = (
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors',
                  step.done
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-muted-foreground'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full',
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
                <span className={cn('text-xs leading-tight', step.done && 'line-through')}>
                  {step.label}
                </span>
              </div>
            )

            if (step.isTour) {
              return (
                <a key={step.label} href="#" onClick={handleTour}>
                  {inner}
                </a>
              )
            }

            return (
              <Link key={step.label} to={step.to}>
                {inner}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
