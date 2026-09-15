'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Mail } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { LandingLogo } from './navbar'
import { scrollToSection } from '@/lib/animations'

const FOOTER_LINKS = [
  { label: 'How it works', href: '#workflow' },
  { label: 'Platform', href: '#product' },
  { label: 'Built for', href: '#built-for' },
  { label: 'Pricing', href: '#pricing' },
]

export const FinalCta = () => (
  <section className="px-3 pb-3 sm:px-5 sm:pb-5">
    <div className="relative overflow-hidden rounded-[28px] bg-[#F1663C] px-5 pb-8 pt-20 text-white sm:rounded-[34px] sm:px-8 sm:pb-10 sm:pt-28 lg:px-12">
      <div className="pointer-events-none absolute -right-36 -top-44 size-[32rem] rounded-full border-[90px] border-white/10" />
      <div className="pointer-events-none absolute -bottom-52 -left-40 size-[30rem] rounded-full border-[80px] border-[#171713]/8" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-5xl text-center"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">READY WHEN YOU ARE</span>
        <h2 className="mt-6 text-[clamp(3rem,8vw,7.25rem)] font-semibold leading-[0.9] tracking-[-0.065em]">
          Make space for
          <span className="block text-[#171713]">your best work.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-white/72 sm:text-lg">
          Bring your leads, knowledge, and marketing into one calmer workspace.
          Start free and shape Allein around the practice you want to run.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="group inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#171713] px-7 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Start for free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="mailto:hello@alleinai.com"
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            <Mail className="size-4" /> Talk to us
          </a>
        </div>
      </motion.div>

      <footer className="relative mx-auto mt-24 grid max-w-7xl gap-10 border-t border-white/20 pt-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <LandingLogo inverse />
          <p className="mt-4 max-w-xs text-xs leading-5 text-white/55">
            An AI operating system for modern, relationship-driven agents.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => {
                event.preventDefault()
                scrollToSection(link.href)
              }}
              className="text-xs font-medium text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>
      </footer>

      <div className="relative mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-white/15 pt-5 text-[10px] text-white/38 sm:flex-row sm:items-center sm:justify-between">
        <span>© 2026 Allein AI. Built in Malaysia.</span>
        <a href="mailto:hello@alleinai.com" className="hover:text-white">hello@alleinai.com</a>
      </div>
    </div>
  </section>
)
