import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Check,
  Gauge,
  LayoutDashboard,
  Loader2,
  Rocket,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBillingSummary } from '@/hooks/use-billing'
import { formatPrice, PLAN_CONFIGS } from '@/lib/plans'

interface SubscriptionSuccessModalProps {
  checkoutReturn?: 'success' | 'canceled'
  onDismiss: () => void
}

interface Benefit {
  icon: typeof Bot
  title: string
  description: string
}

const CONFIRMED_STATUSES = ['active', 'trialing']

function benefitsForPlan(tier: 'lite' | 'pro'): Benefit[] {
  const plan = PLAN_CONFIGS[tier]
  const agents = plan.limits.agents.max ?? 'Unlimited'
  const messages = plan.limits.messages.max

  if (tier === 'pro') {
    return [
      {
        icon: Bot,
        title: `${agents} AI agents`,
        description: 'Build a specialist team for every part of your practice.',
      },
      {
        icon: Gauge,
        title: 'Unlimited conversations',
        description: 'Keep client work moving without daily message limits.',
      },
      {
        icon: Sparkles,
        title: 'Pro tools unlocked',
        description: 'Use AI images, API access, broadcasts, and priority support.',
      },
    ]
  }

  return [
    {
      icon: Bot,
      title: `${agents} AI agents`,
      description: 'Create focused assistants for your most important workflows.',
    },
    {
      icon: Gauge,
      title: `${messages} messages each day`,
      description: 'More room to think, draft, and follow through with clients.',
    },
    {
      icon: Rocket,
      title: 'Automation unlocked',
      description: 'Schedule posts and connect your Telegram bot.',
    },
  ]
}

export function SubscriptionSuccessModal({
  checkoutReturn,
  onDismiss,
}: SubscriptionSuccessModalProps) {
  const queryClient = useQueryClient()
  const reduceMotion = useReducedMotion()
  const {
    data: billingData,
    isFetching,
    refetch,
  } = useBillingSummary()
  const [timedOut, setTimedOut] = useState(false)

  const summary =
    billingData && !('error' in billingData) ? billingData : null
  const confirmedTier =
    summary?.provider === 'stripe' &&
    CONFIRMED_STATUSES.includes(summary.status) &&
    (summary.plan === 'lite' || summary.plan === 'pro')
      ? summary.plan
      : null

  const benefits = useMemo(
    () => (confirmedTier ? benefitsForPlan(confirmedTier) : []),
    [confirmedTier],
  )

  useEffect(() => {
    if (checkoutReturn !== 'success' || confirmedTier || timedOut) return

    void refetch()
    const interval = window.setInterval(() => void refetch(), 1_500)
    const timeout = window.setTimeout(() => setTimedOut(true), 18_000)

    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [checkoutReturn, confirmedTier, refetch, timedOut])

  useEffect(() => {
    if (!confirmedTier) return
    void queryClient.invalidateQueries({ queryKey: ['profile'] })
  }, [confirmedTier, queryClient])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) onDismiss()
  }

  if (checkoutReturn !== 'success') return null

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden border-black/[0.06] bg-[#fffdfa] p-0 shadow-2xl dark:border-white/10 dark:bg-[#12110f] sm:max-w-[620px]"
      >
        {confirmedTier ? (
          <SuccessContent
            tier={confirmedTier}
            benefits={benefits}
            reduceMotion={Boolean(reduceMotion)}
          />
        ) : (
          <PendingContent
            timedOut={timedOut}
            isFetching={isFetching}
            onRetry={() => {
              setTimedOut(false)
              void refetch()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SuccessContent({
  tier,
  benefits,
  reduceMotion,
}: {
  tier: 'lite' | 'pro'
  benefits: Benefit[]
  reduceMotion: boolean
}) {
  const plan = PLAN_CONFIGS[tier]

  return (
    <>
      <div className="relative overflow-hidden px-6 pb-7 pt-9 text-center sm:px-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(241,102,60,0.22),transparent_58%)]" />
        <div className="pointer-events-none absolute -left-20 top-10 size-44 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -top-10 size-48 rounded-full bg-orange-400/15 blur-3xl" />

        {!reduceMotion &&
          ([
            ['12%', '24%', '#F1663C', -18],
            ['23%', '9%', '#F4B860', 24],
            ['77%', '13%', '#F1663C', 16],
            ['88%', '31%', '#8AB17D', -22],
            ['67%', '34%', '#F4B860', 34],
          ] as const).map(([left, top, color, rotate], index) => (
            <motion.span
              key={`${left}-${top}`}
              className="absolute h-2 w-1 rounded-full"
              style={{ left, top, backgroundColor: color }}
              initial={{ opacity: 0, y: -8, rotate: Number(rotate) }}
              animate={{ opacity: [0, 1, 0], y: [-8, 8, 22] }}
              transition={{
                duration: 1.4,
                delay: 0.15 + index * 0.08,
                ease: 'easeOut',
              }}
            />
          ))}

        <motion.div
          className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#F1663C] text-white shadow-[0_16px_45px_rgba(241,102,60,0.3)]"
          initial={reduceMotion ? false : { scale: 0.7, rotate: -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <Check className="size-8" strokeWidth={2.5} />
        </motion.div>

        <DialogHeader className="relative mt-5 text-center sm:text-center">
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full border border-[#F1663C]/20 bg-[#F1663C]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C94C28] dark:text-[#FF8B67]">
            <Sparkles className="size-3" /> Upgrade confirmed
          </div>
          <DialogTitle className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            You&apos;re on {plan.label}.
          </DialogTitle>
          <DialogDescription className="mx-auto max-w-md text-sm leading-6">
            Your new limits are active. You now have more room to automate,
            create, and keep client work moving.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto mt-5 flex w-fit items-baseline gap-2 rounded-xl border border-black/[0.06] bg-white/70 px-4 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-sm font-semibold">{plan.label}</span>
          <span className="text-xs text-muted-foreground">
            {formatPrice(plan, true)}
          </span>
        </div>
      </div>

      <motion.div
        className="grid gap-2 border-y border-black/[0.06] bg-black/[0.018] px-5 py-5 dark:border-white/10 dark:bg-white/[0.02] sm:grid-cols-3 sm:px-7"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
        }}
      >
        {benefits.map((benefit) => {
          const Icon = benefit.icon
          return (
            <motion.div
              key={benefit.title}
              className="rounded-2xl border border-black/[0.06] bg-white/75 p-3.5 text-left dark:border-white/10 dark:bg-white/[0.035]"
              variants={{
                hidden: { opacity: 0, y: reduceMotion ? 0 : 8 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-[#F1663C]/10 text-[#D95731] dark:text-[#FF8B67]">
                <Icon className="size-4" />
              </div>
              <p className="text-sm font-semibold">{benefit.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {benefit.description}
              </p>
            </motion.div>
          )
        })}
      </motion.div>

      <DialogFooter className="gap-2 px-5 pb-6 pt-5 sm:px-7">
        <Button variant="outline" asChild>
          <Link to="/dashboard">
            <LayoutDashboard /> Go to dashboard
          </Link>
        </Button>
        <Button
          asChild
          className="bg-[#F1663C] text-white shadow-sm hover:bg-[#DD5933]"
        >
          <Link to="/agents">
            Create an agent <ArrowRight />
          </Link>
        </Button>
      </DialogFooter>
    </>
  )
}

function PendingContent({
  timedOut,
  isFetching,
  onRetry,
}: {
  timedOut: boolean
  isFetching: boolean
  onRetry: () => void
}) {
  return (
    <div className="relative overflow-hidden px-7 py-12 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(241,102,60,0.16),transparent_60%)]" />
      <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#F1663C]/15 bg-[#F1663C]/8 text-[#D95731] dark:text-[#FF8B67]">
        <Loader2 className="size-6 animate-spin" />
      </div>
      <DialogHeader className="relative mt-5 text-center sm:text-center">
        <DialogTitle className="text-2xl tracking-[-0.025em]">
          {timedOut ? 'Your upgrade is taking a moment' : 'Activating your plan…'}
        </DialogTitle>
        <DialogDescription className="mx-auto max-w-sm leading-6">
          {timedOut
            ? 'Stripe has returned you safely. We are still waiting for the verified subscription update.'
            : 'Payment received. We’re confirming your new access with Stripe now—this usually takes only a few seconds.'}
        </DialogDescription>
      </DialogHeader>
      <div className="relative mt-6">
        {timedOut ? (
          <Button variant="outline" onClick={onRetry} disabled={isFetching}>
            {isFetching ? <Loader2 className="animate-spin" /> : null}
            Check again
          </Button>
        ) : (
          <div className="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
            <motion.div
              className="h-full w-1/3 rounded-full bg-[#F1663C]"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}
      </div>
      <p className="relative mt-5 text-[11px] text-muted-foreground">
        You can close this window—your access will update automatically.
      </p>
    </div>
  )
}
