'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { SectionLabel } from './section-label'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    name: 'Starter',
    desc: 'Ideal for individual marketers or small teams.',
    price: '$199',
    features: [
      'Up to 2 users',
      'Basic AI campaign tools',
      'Task creation & management',
      'Real-time reporting',
    ],
    featured: false,
    cta: 'Sign Up',
    ctaInverted: false,
  },
  {
    name: 'Professional',
    desc: 'Perfect for growing teams needing advanced features.',
    price: '$499',
    features: [
      'Up to 10 users',
      'Advanced AI campaign tools',
      'Real-time reporting',
      'AI content suggestions',
    ],
    featured: true,
    cta: 'Contact Sales',
    ctaInverted: true,
  },
  {
    name: 'Enterprise',
    desc: 'Designed for large teams and corporations.',
    price: '$899',
    features: [
      'Unlimited Users',
      'Custom AI solutions',
      'Dedicated account manager',
      'Priority support',
    ],
    featured: false,
    cta: 'Contact Sales',
    ctaInverted: false,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl text-center">
        <SectionLabel className="text-black/40">PRICING</SectionLabel>
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-black md:text-5xl">
          Flexible plans for every team.
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-3xl p-8 text-left',
                plan.featured
                  ? 'scale-105 bg-black text-white shadow-2xl'
                  : 'bg-[#F2EEEA] text-black',
              )}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p
                className={cn(
                  'mt-2 text-sm leading-relaxed',
                  plan.featured ? 'text-white/70' : 'text-black/60',
                )}
              >
                {plan.desc}
              </p>
              <div className="my-6 border-t border-white/10" />
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span
                  className={cn(
                    'text-sm',
                    plan.featured ? 'text-white/60' : 'text-black/40',
                  )}
                >
                  /mo
                </span>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        plan.featured ? 'text-white' : 'text-black',
                      )}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-8 block">
                <button
                  className={cn(
                    'w-full rounded-full py-3 text-sm font-medium transition-opacity hover:opacity-90',
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
