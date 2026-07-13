'use client'

import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { MessageCircle, BookOpen, Wand2, KanbanSquare } from 'lucide-react'
import { SectionLabel } from './section-label'
import { staggerContainer, springStaggerItem } from '@/lib/animations'

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
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  // Left column fades slightly as you scroll past — subtle depth cue.
  const leftOpacity = useTransform(scrollYProgress, [0, 0.4, 0.8, 1], [1, 1, 0.5, 0.3])

  return (
    <section ref={sectionRef} className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl md:grid md:grid-cols-2 md:gap-16">
        {/* Left sticky column — scroll-linked fade */}
        <motion.div style={{ opacity: leftOpacity }} className="md:sticky md:top-32 md:h-fit">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionLabel className="text-white/60">THE SOLUTION</SectionLabel>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              One dashboard replaces{' '}
              <span className="text-orange-200">3–4 tools</span>.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/80">
              CRM, AI chat, marketing studio, reminders, and social posting —
              all in one place, sharing one memory. No app-switching, no
              copy-paste, no leads slipping through.
            </p>
          </motion.div>
        </motion.div>

        {/* Right pillar grid — spring-staggered */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-0"
        >
          {PILLARS.map((p) => (
            <motion.div
              key={p.title}
              variants={springStaggerItem}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
              className="rounded-3xl border border-white/10 p-7 transition-colors duration-300 hover:border-white/20"
              style={{ background: 'rgba(40,20,10,0.35)', backdropFilter: 'blur(12px)' }}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="flex size-11 items-center justify-center rounded-xl bg-white/10"
              >
                <p.icon className="size-5 text-orange-200" />
              </motion.div>
              <h3 className="mt-5 text-xl font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{p.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
