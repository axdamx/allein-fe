'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { SectionLabel } from './section-label'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Free',
    desc: 'Try the full experience, forever.',
    price: 'RM0',
    period: 'forever',
    features: ['10 AI messages / day', '10 leads', '3 marketing posts'],
    featured: false,
    cta: 'Start free',
  },
  {
    name: 'Lite',
    desc: 'For solo agents getting started.',
    price: 'RM99',
    period: '/month',
    features: ['30 messages / day', '100 leads', 'WhatsApp reminders'],
    featured: false,
    cta: 'Choose Lite',
  },
  {
    name: 'Pro',
    desc: 'For agents running a real practice.',
    price: 'RM249',
    period: '/month',
    features: [
      'Unlimited AI chat',
      'Social auto-posting',
      '5 AI videos / month',
    ],
    featured: true,
    cta: 'Choose Pro',
  },
  {
    name: 'Custom',
    desc: 'For agencies & teams.',
    price: 'RM799',
    period: '+/month',
    features: ['5–50+ agent seats', 'White-label branding', 'Admin dashboard'],
    featured: false,
    cta: 'Contact us',
  },
]

export const PricingSection = () => {
  return (
    <section
      id="pricing"
      data-nav-theme="light"
      className="bg-white px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl text-center">
        <SectionLabel className="text-black/40">PRICING</SectionLabel>
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-black md:text-5xl">
          Pricing that scales with your practice.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-black/55">
          From free forever to white-label. Upgrade only when you&apos;re ready.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-3xl p-7 text-left',
                plan.featured
                  ? 'bg-black text-white shadow-2xl lg:-translate-y-3'
                  : 'bg-[#F7F3EF] text-black',
              )}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-black">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p
                className={cn(
                  'mt-1.5 text-sm leading-relaxed',
                  plan.featured ? 'text-white/65' : 'text-black/55',
                )}
              >
                {plan.desc}
              </p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span
                  className={cn(
                    'text-sm',
                    plan.featured ? 'text-white/55' : 'text-black/45',
                  )}
                >
                  {plan.period}
                </span>
              </div>

              <div
                className={cn(
                  'my-6 border-t',
                  plan.featured ? 'border-white/10' : 'border-black/10',
                )}
              />

              <ul className="flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        plan.featured ? 'text-orange-300' : 'text-[#E8804A]',
                      )}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/login" className="mt-7 block">
                <button
                  className={cn(
                    'w-full rounded-full py-3 text-sm font-medium transition-transform hover:scale-[1.02]',
                    plan.featured
                      ? 'bg-white text-black'
                      : 'bg-black text-white',
                  )}
                >
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
