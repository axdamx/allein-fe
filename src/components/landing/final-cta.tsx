'use client'

import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  motion,
  wordContainer,
  wordItem,
  staggerContainer,
  staggerItem,
  scrollToSection,
} from '@/lib/animations'
import { MagneticButton } from './motion-components'

const FOOTER_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Product', href: '#product' },
  { label: 'Why Allein', href: '#why' },
  { label: 'Pricing', href: '#pricing' },
]

const headline = 'Save 3–5 hours a day. Close more leads. Post faster.'
const headlineWords = headline.split(' ')

export const FinalCta = () => {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-40">
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute left-1/4 top-10 size-80 animate-float-slow rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 animate-float rounded-full bg-orange-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Headline — word-by-word reveal */}
        <motion.h2
          variants={wordContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-wrap justify-center gap-x-[0.25em] text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl"
        >
          {headlineWords.map((word, i) => (
            <motion.span key={i} variants={wordItem}>
              {word}
            </motion.span>
          ))}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
        >
          Allein AI is the operating system every Malaysian agent deserves —
          one dashboard for leads, follow-ups, and marketing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <MagneticButton>
            <Link to="/login">
              <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]">
                Start free
                <span className="flex size-5 items-center justify-center rounded-full bg-black">
                  <ArrowRight className="size-3 text-white" />
                </span>
              </button>
            </Link>
          </MagneticButton>
          <MagneticButton strength={0.15}>
            <a
              href="#pricing"
              onClick={(e) => {
                e.preventDefault()
                scrollToSection('#pricing')
              }}
            >
              <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white">
                View pricing
              </button>
            </a>
          </MagneticButton>
        </motion.div>
      </div>

      <footer className="relative z-10 mx-auto mt-32 flex max-w-7xl flex-col items-start justify-between gap-8 border-t border-white/10 pt-12 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white text-black">
              A
            </span>
            Allein AI
          </div>
          <div className="mt-1 text-sm text-white/50">For Agents, By Agents</div>
          <a
            href="mailto:hello@alleinai.com"
            className="mt-3 block text-sm text-white/60 transition-colors hover:text-white"
          >
            hello@alleinai.com
          </a>
          <a
            href="https://alleinai.com"
            className="block text-sm text-white/60 transition-colors hover:text-white"
          >
            alleinai.com
          </a>
        </div>

        {/* Footer links — staggered fade-in */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex gap-12"
        >
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Menu
            </div>
            <motion.div variants={staggerContainer} className="flex flex-col gap-2">
              {FOOTER_LINKS.map((item) => (
                <motion.a
                  key={item.href}
                  variants={staggerItem}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToSection(item.href)
                  }}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {item.label}
                </motion.a>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </footer>
    </section>
  )
}
