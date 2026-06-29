'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { SectionLabel } from './section-label'
import { cn } from '@/lib/utils'

const BENEFITS = [
  {
    stat: '+48%',
    label: 'Conversion Boost',
    inverted: true,
  },
  {
    stat: '−21%',
    label: 'Cost Reduction',
    inverted: false,
  },
  {
    stat: '10K+',
    label: 'Happy Clients',
    inverted: false,
  },
  {
    stat: '21+',
    label: 'Years of Expertise',
    inverted: false,
  },
]

export const Benefits = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      id="benefits"
      ref={sectionRef}
      className="relative px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl md:grid md:grid-cols-2 md:gap-16">
        <div className="md:sticky md:top-32 md:h-fit">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <SectionLabel className="text-white/60">BENEFITS</SectionLabel>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Efficient. Scalable.
              <br />
              Innovative.
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/80">
              Welcome to Creative Marketing Agency.
            </p>
          </motion.div>
        </div>

        <div className="mt-12 flex flex-col gap-6 md:mt-0">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.label}
              className={cn(
                'overflow-hidden rounded-3xl p-10',
                benefit.inverted
                  ? 'bg-white text-black'
                  : 'border border-white/10',
              )}
              style={
                !benefit.inverted
                  ? {
                      background: 'rgba(40,20,10,0.35)',
                      backdropFilter: 'blur(12px)',
                    }
                  : undefined
              }
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="text-6xl font-bold tracking-tight md:text-7xl">
                {benefit.stat}
              </div>
              <div
                className={cn(
                  'mt-3 text-sm font-medium uppercase tracking-widest',
                  benefit.inverted ? 'text-black/60' : 'text-white/60',
                )}
              >
                {benefit.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
