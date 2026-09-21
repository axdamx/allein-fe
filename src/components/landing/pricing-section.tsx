'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PLAN_CONFIGS, PLAN_ORDER, formatPrice, type PlanConfig } from '@/lib/plans'
import { cn } from '@/lib/utils'
import { SectionLabel } from './section-label'

const planFeatures = (plan: PlanConfig) => {
  const agents = plan.limits.agents.max
  const messages = plan.limits.messages.max
  const leads = plan.limits.leads.max

  return [
    agents === null ? 'Unlimited AI agents' : `${agents} AI agent${agents === 1 ? '' : 's'}`,
    messages === null ? 'Unlimited AI messages' : `${messages} AI messages / day`,
    leads === null ? 'Unlimited leads' : `${leads} active leads`,
    plan.features.aiVideoGen
      ? 'AI images · video coming soon'
      : plan.features.aiImageGen
        ? 'AI image generation'
        : plan.features.scheduledPosts
          ? 'Scheduled marketing posts'
          : 'Marketing Studio access',
  ]
}

export const PricingSection = () => (
  <section id="pricing" className="scroll-mt-28 px-5 py-24 sm:px-8 sm:py-32">
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-6 text-center"
      >
        <div>
          <SectionLabel>PRICING</SectionLabel>
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            Start small. Grow without rebuilding.
          </h2>
        </div>
        <p className="mx-auto max-w-xl text-base leading-7 text-[#171713]/52">
          Every plan starts with the same connected foundation. Upgrade when
          you need more volume, automation, or people in the workspace.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((tier, index) => {
          const plan = PLAN_CONFIGS[tier]
          const featured = Boolean(plan.featured)

          return (
            <motion.article
              key={tier}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className={cn(
                'relative flex min-h-[430px] flex-col rounded-[26px] border p-6',
                featured
                  ? 'border-[#171713] bg-[#171713] text-white shadow-[0_24px_65px_rgba(25,22,17,0.18)]'
                  : 'border-[#171713]/9 bg-white/50 text-[#171713]',
              )}
            >
              {featured ? (
                <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-[#F1663C] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white">
                  <Sparkles className="size-3" /> Most popular
                </span>
              ) : null}

              <div className={cn('text-sm font-semibold', featured ? 'text-[#F49A70]' : 'text-[#F1663C]')}>
                {plan.label}
              </div>
              <p className={cn('mt-2 min-h-10 text-xs leading-5', featured ? 'text-white/45' : 'text-[#171713]/42')}>
                {plan.tagline}
              </p>

              <div className="mt-7 flex items-end gap-1.5">
                <span className="text-4xl font-semibold tracking-[-0.05em]">{formatPrice(plan)}</span>
                {plan.price !== null && plan.price > 0 ? (
                  <span className={cn('pb-1 text-xs', featured ? 'text-white/35' : 'text-[#171713]/35')}>
                    {plan.period}
                  </span>
                ) : null}
              </div>

              <div className={cn('my-7 h-px', featured ? 'bg-white/10' : 'bg-[#171713]/10')} />

              <ul className="flex-1 space-y-3.5">
                {planFeatures(plan).map((feature) => (
                  <li key={feature} className={cn('flex gap-2.5 text-xs leading-5', featured ? 'text-white/68' : 'text-[#171713]/58')}>
                    <Check className={cn('mt-0.5 size-3.5 shrink-0', featured ? 'text-[#F49A70]' : 'text-[#F1663C]')} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={cn(
                  'group mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-transform hover:-translate-y-0.5',
                  featured ? 'bg-[#F1663C] text-white' : 'bg-[#171713] text-white',
                )}
              >
                {plan.cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.article>
          )
        })}
      </div>

      <p className="mt-8 text-center text-xs text-[#171713]/40">
        Need the full breakdown?{' '}
        <Link to="/pricing" className="font-semibold text-[#171713] underline decoration-[#F1663C] underline-offset-4">
          Compare every feature
        </Link>
      </p>
    </div>
  </section>
)
