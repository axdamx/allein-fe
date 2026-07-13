'use client'

import { useRef } from 'react'
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  motion,
  useScroll,
  useTransform,
  wordContainer,
  wordItem,
  staggerContainer,
  staggerItem,
  scrollToSection,
} from '@/lib/animations'

export const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Parallax: card drifts up, orbs drift at different rates.
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -80])
  const orb1Y = useTransform(scrollYProgress, [0, 1], [0, 60])
  const orb2Y = useTransform(scrollYProgress, [0, 1], [0, -40])

  const headline = 'The AI operating system for Malaysian agents'
  const headlineWords = headline.split(' ')

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-svh items-center overflow-hidden px-6 pt-24"
    >
      {/* Ambient floating orbs for depth — parallax-linked */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <motion.div
          style={{ y: orb1Y }}
          className="absolute -left-16 top-24 size-80 animate-float rounded-full bg-white/10 blur-3xl"
        />
        <motion.div
          style={{ y: orb2Y }}
          className="absolute bottom-1/4 -right-8 size-96 animate-float-delayed rounded-full bg-orange-300/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start gap-10 md:flex-row md:items-center md:gap-16">
        {/* Left column — copy */}
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm"
          >
            <Sparkles className="size-3.5" />
            Built for Malaysian agents
          </motion.div>

          {/* Headline — word-by-word reveal */}
          <motion.h1
            variants={wordContainer}
            initial="hidden"
            animate="visible"
            className="mt-6 flex flex-wrap gap-x-[0.25em] text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl"
          >
            {headlineWords.map((word, i) => (
              <motion.span
                key={i}
                variants={wordItem}
                className={word === 'Malaysian' || word === 'agents' ? 'text-orange-200' : ''}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg"
          >
            Capture leads, follow up automatically, and post marketing content
            from one AI dashboard. Your agent replies on WhatsApp, reads your
            own documents, and creates social posts — saving{' '}
            <span className="font-semibold text-white">3–5 hours a day</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <Link to="/login">
              <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]">
                Start free
                <span className="flex size-5 items-center justify-center rounded-full bg-black">
                  <ArrowRight className="size-3 text-white" />
                </span>
              </button>
            </Link>
            <a
              href="#product"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('#product')
              }}
            >
              <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white">
                See how it works
              </button>
            </a>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60"
          >
            <span className="flex items-center gap-2">
              <MessageCircle className="size-4" /> Saves 3–5 hrs/day
            </span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Speaks BM &amp; English</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>No credit card</span>
          </motion.div>
        </motion.div>

        {/* Right column — floating product preview card with parallax */}
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 40, rotateY: -8 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ y: cardY, perspective: 1000 }}
        >
          <div
            className="rounded-2xl border border-white/15 p-5 shadow-2xl"
            style={{ background: 'rgba(40,20,10,0.5)', backdropFilter: 'blur(16px)' }}
          >
            {/* Mock chat header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-green-500/20 text-xs font-semibold text-green-300">
                  WA
                </span>
                <div>
                  <div className="text-sm font-medium text-white">Siti — Property lead</div>
                  <div className="text-[11px] text-white/50">Online · WhatsApp</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                AUTO-REPLY
              </span>
            </div>

            {/* Mock chat messages — staggered bubble entrance */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              transition={{ delayChildren: 1, staggerChildren: 0.3 }}
              className="mt-4 space-y-3"
            >
              <motion.div
                variants={staggerItem}
                className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-white/15 px-3 py-2 text-sm text-white/90"
              >
                Hi, is the condo in Mont Kiara still available?
              </motion.div>
              <motion.div
                variants={staggerItem}
                className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-black/30 px-3 py-2 text-sm text-white/90"
              >
                Hi Siti! Yes — 2 beds, RM 1.3M. Move-in ready. Want me to
                schedule a viewing this weekend?
              </motion.div>
              <motion.div
                variants={staggerItem}
                className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-white/15 px-3 py-2 text-sm text-white/90"
              >
                Yes please 🙏
              </motion.div>
              <motion.div
                variants={staggerItem}
                className="flex items-center gap-2 pt-1 text-[11px] text-white/40"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Viewing booked · reminder sent · lead added to CRM
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
