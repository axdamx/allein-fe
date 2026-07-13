'use client'

import { Check } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { SectionLabel } from './section-label'
import { cn } from '@/lib/utils'
import { staggerContainer, springStaggerItem } from '@/lib/animations'

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
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="scroll-mt-24 bg-white px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-6xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionLabel className="text-black/40">PRICING</SectionLabel>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-black md:text-5xl">
            Pricing that scales with your practice.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-black/55">
            From free forever to white-label. Upgrade only when you&apos;re ready.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={springStaggerItem}
              whileHover={{ y: -4 }}
              className={cn(
                'relative flex flex-col rounded-3xl p-7 text-left',
                plan.featured
                  ? 'bg-black text-white shadow-2xl lg:-translate-y-3'
                  : 'bg-[#F7F3EF] text-black',
              )}
            >
              {plan.featured && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-400 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-black"
                >
                  Most popular
                </motion.span>
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
        </motion.div>
      </div>
    </section>
  )
}
