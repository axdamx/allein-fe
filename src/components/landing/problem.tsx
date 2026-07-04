'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Clock, Users, Wallet } from 'lucide-react'
import { SectionLabel } from './section-label'

const PAIN_POINTS = [
  {
    icon: Clock,
    stat: '3–5 hrs',
    label: 'lost every day',
    detail: 'to follow-ups, data entry, and repetitive replies.',
  },
  {
    icon: Users,
    stat: '182,000+',
    label: 'field agents',
    detail: 'in Malaysia with no AI-native tools built for them.',
  },
  {
    icon: Wallet,
    stat: 'RM800+',
    label: 'per month',
    detail: 'on generic CRM tools that weren&apos;t built for agents.',
  },
]

export const Problem = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section id="problem" ref={sectionRef} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel className="text-white/60">THE PROBLEM</SectionLabel>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
            Agents spend more time on admin
            <br />
            than on clients.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75">
            Clients expect instant replies — day or night, on WhatsApp or
            Telegram. But the tools meant to help were never built for the way
            agents actually work.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PAIN_POINTS.map((p, i) => (
            <motion.div
              key={p.stat}
              className="rounded-3xl border border-white/10 p-8 text-left"
              style={{ background: 'rgba(40,20,10,0.35)', backdropFilter: 'blur(12px)' }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <p.icon className="size-6 text-orange-200" />
              <div className="mt-5 text-4xl font-bold tracking-tight text-white">
                {p.stat}
              </div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-white/50">
                {p.label}
              </div>
              <p
                className="mt-3 text-sm leading-relaxed text-white/70"
                dangerouslySetInnerHTML={{ __html: p.detail }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
