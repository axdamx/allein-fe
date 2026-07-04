'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Check, X } from 'lucide-react'
import { SectionLabel } from './section-label'

const COMPETITORS = [
  {
    alt: 'ChatGPT / Claude.ai',
    cat: 'General AI',
    gap: 'No workflow, no CRM, no social posting',
  },
  {
    alt: 'HubSpot',
    cat: 'General CRM',
    gap: 'RM800+/mo, not agent-specific, no AI marketing',
  },
  {
    alt: 'PropertyGuru CRM',
    cat: 'Property-only',
    gap: 'No AI, no cross-vertical, no automation',
  },
  {
    alt: 'Canva + ChatGPT',
    cat: 'DIY design + AI',
    gap: 'Two separate tools, no CRM, no auto-posting',
  },
]

const MOATS = [
  'Speaks BM + English natively',
  'Malaysian bank loan rates built in',
  'MyKad & PropertyGuru integration',
  'One agent, every channel',
]

export const WhyWeWin = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      id="why"
      ref={sectionRef}
      data-nav-theme="light"
      className="bg-[#F7F3EF] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel className="text-black/40">WHY ALLEIN</SectionLabel>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-black md:text-5xl">
            Purpose-built beats generic — every time.
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Comparison table */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-3xl border border-black/5 bg-white"
          >
            <div className="grid grid-cols-[1.4fr_1fr_1.6fr] gap-2 border-b border-black/10 bg-black px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-white/70">
              <span>Alternative</span>
              <span>Category</span>
              <span>The gap</span>
            </div>
            {COMPETITORS.map((c) => (
              <div
                key={c.alt}
                className="grid grid-cols-[1.4fr_1fr_1.6fr] gap-2 border-b border-black/5 px-5 py-4 text-sm last:border-0"
              >
                <span className="font-medium text-black">{c.alt}</span>
                <span className="text-black/50">{c.cat}</span>
                <span className="flex items-start gap-2 text-black/60">
                  <X className="mt-0.5 size-4 shrink-0 text-red-400" />
                  {c.gap}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Our moat */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-center rounded-3xl bg-black p-8 text-white"
          >
            <div className="text-sm font-semibold uppercase tracking-widest text-orange-300">
              Our moat
            </div>
            <ul className="mt-5 space-y-4">
              {MOATS.map((m) => (
                <li key={m} className="flex items-center gap-3 text-base">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-400/20">
                    <Check className="size-3.5 text-orange-300" />
                  </span>
                  {m}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
