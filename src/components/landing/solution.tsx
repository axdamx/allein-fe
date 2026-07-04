'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MessageCircle, BookOpen, Wand2, KanbanSquare } from 'lucide-react'
import { SectionLabel } from './section-label'

const PILLARS = [
  {
    icon: MessageCircle,
    title: 'Talks to clients',
    body: 'Answers on WhatsApp & Telegram instantly, day or night — in Bahasa Malaysia and English.',
  },
  {
    icon: BookOpen,
    title: 'Knows the business',
    body: 'Reads your own listings, policies & documents — answers from them, not from guesses.',
  },
  {
    icon: Wand2,
    title: 'Creates marketing',
    body: 'Generates images, video & captions, then posts to your social channels automatically.',
  },
  {
    icon: KanbanSquare,
    title: 'Runs the CRM',
    body: 'Tracks leads, fires reminders, never lets a follow-up slip through the cracks.',
  },
]

export const Solution = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl md:grid md:grid-cols-2 md:gap-16">
        <div className="md:sticky md:top-32 md:h-fit">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <SectionLabel className="text-white/60">THE SOLUTION</SectionLabel>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              One AI agent that runs the entire practice.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
              Built by agents, for agents — Allein AI plugs into how you already
              work: WhatsApp, Telegram, and one dashboard.
            </p>
          </motion.div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-0">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              className="rounded-3xl border border-white/10 p-7"
              style={{ background: 'rgba(40,20,10,0.35)', backdropFilter: 'blur(12px)' }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                <p.icon className="size-5 text-orange-200" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
