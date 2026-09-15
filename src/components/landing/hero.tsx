'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ChevronDown,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { scrollToSection } from '@/lib/animations'

export const Hero = () => {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-5">
      <div className="relative min-h-[940px] overflow-hidden rounded-[28px] bg-[#171713] px-5 pb-14 pt-32 text-white sm:min-h-0 sm:rounded-[34px] sm:px-8 sm:pb-20 sm:pt-40 lg:px-12 lg:pb-10">
        <div className="landing-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -left-32 -top-48 size-[34rem] rounded-full bg-[#F1663C]/25 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-52 right-[-12rem] size-[38rem] rounded-full bg-[#F5B58C]/15 blur-[120px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:min-h-[720px] lg:grid-cols-[0.86fr_1.14fr] lg:gap-12">
          <motion.div
            initial={false}
            className="relative z-10"
          >
            <motion.div
              initial={false}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-white/70 backdrop-blur"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#F89A6F] opacity-50" />
                <span className="relative inline-flex size-2 rounded-full bg-[#F1663C]" />
              </span>
              AI workspace for Malaysia&apos;s client-facing agents
            </motion.div>

            <h1 className="mt-7 max-w-2xl text-[clamp(3.25rem,7vw,6.8rem)] font-semibold leading-[0.91] tracking-[-0.065em]">
              Your practice,
              <span className="block text-[#F49A70]">finally in flow.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-7 text-white/62 sm:text-lg sm:leading-8">
              Turn conversations into clients, follow-ups, and ready-to-publish
              content from one intelligent workspace built around your day.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="group inline-flex h-13 items-center justify-center gap-2 rounded-full bg-[#F1663C] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(241,102,60,0.25)] transition-transform hover:-translate-y-0.5"
              >
                Start building for free
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#product"
                onClick={(event) => {
                  event.preventDefault()
                  scrollToSection('#product')
                }}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 text-sm font-medium text-white/75 transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                Explore the platform
                <ChevronDown className="size-4" />
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
              {['Free to start', 'No credit card', 'BM + English'].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-[#F49A70]" /> {item}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={false}
            className="relative mx-auto w-full max-w-[720px] lg:ml-auto"
          >
            <div className="absolute -inset-5 rounded-[32px] bg-gradient-to-br from-[#F1663C]/20 via-transparent to-[#F5B58C]/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#22221D]/90 shadow-[0_36px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#FF6B57]" />
                  <span className="size-2.5 rounded-full bg-[#F6C35B]" />
                  <span className="size-2.5 rounded-full bg-[#65C466]" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/28">
                  Live workspace
                </span>
                <MoreHorizontal className="size-4 text-white/30" />
              </div>

              <div className="grid min-h-[430px] grid-cols-1 sm:grid-cols-[150px_1fr]">
                <aside className="hidden border-r border-white/[0.07] p-4 sm:block">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#F1663C] text-[10px]">
                      A
                    </span>
                    Command
                  </div>
                  <div className="mt-7 space-y-1.5 text-[11px] text-white/38">
                    {['Overview', 'AI assistant', 'Pipeline', 'Studio', 'Knowledge'].map(
                      (item, index) => (
                        <div
                          key={item}
                          className={`rounded-lg px-2.5 py-2 ${
                            index === 0 ? 'bg-white/[0.08] text-white' : ''
                          }`}
                        >
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                </aside>

                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                        Monday, 9:41 AM
                      </p>
                      <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                        Good morning, Adam
                      </h2>
                    </div>
                    <div className="flex size-9 items-center justify-center rounded-full border border-[#F1663C]/30 bg-[#F1663C]/10">
                      <Sparkles className="size-4 text-[#F49A70]" />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    {[
                      { value: '18', label: 'Active leads', icon: TrendingUp },
                      { value: '06', label: 'Follow-ups', icon: CalendarCheck2 },
                      { value: '12', label: 'Posts ready', icon: FileText },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                        <stat.icon className="size-3.5 text-[#F49A70]" />
                        <div className="mt-4 text-xl font-semibold tracking-tight">{stat.value}</div>
                        <div className="mt-0.5 text-[9px] leading-3 text-white/35">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Priority leads</span>
                        <span className="text-[9px] text-white/30">Today</span>
                      </div>
                      <div className="mt-3 space-y-2.5">
                        {[
                          ['SK', 'Siti K.', 'Viewing confirmed', '#F49A70'],
                          ['JL', 'Jason L.', 'Policy follow-up', '#B9DFA4'],
                          ['NA', 'Nur A.', 'Proposal opened', '#D7C4F5'],
                        ].map(([initials, name, status, color]) => (
                          <div key={name} className="flex items-center gap-2.5 rounded-lg bg-black/15 p-2">
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-black"
                              style={{ backgroundColor: color }}
                            >
                              {initials}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[10px] font-medium">{name}</span>
                              <span className="block truncate text-[8px] text-white/32">{status}</span>
                            </span>
                            <span className="size-1.5 rounded-full bg-[#73D082]" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-[#F1663C] p-4 text-white">
                      <div className="flex items-center justify-between">
                        <MessageCircle className="size-4" />
                        <span className="rounded-full bg-white/15 px-2 py-1 text-[8px] uppercase tracking-wider">
                          AI active
                        </span>
                      </div>
                      <p className="mt-8 text-sm font-medium leading-5">
                        “Draft a follow-up for my warm property leads.”
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-[9px] text-white/65">
                        <span className="flex gap-1">
                          <span className="size-1 animate-pulse rounded-full bg-white" />
                          <span className="size-1 animate-pulse rounded-full bg-white [animation-delay:150ms]" />
                          <span className="size-1 animate-pulse rounded-full bg-white [animation-delay:300ms]" />
                        </span>
                        Working across CRM + knowledge
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              className="absolute -bottom-7 -left-2 hidden items-center gap-3 rounded-2xl border border-black/[0.08] bg-[#FAF7F1] p-3 text-[#171713] shadow-[0_20px_55px_rgba(0,0,0,0.22)] sm:flex lg:-left-9"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#E3F2D7]">
                <CalendarCheck2 className="size-4 text-[#3D712C]" />
              </span>
              <span>
                <span className="block text-[11px] font-semibold">Follow-up scheduled</span>
                <span className="block text-[9px] text-black/40">Siti · Tomorrow, 10:00</span>
              </span>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative mx-auto mt-10 flex max-w-7xl flex-col gap-4 border-t border-white/[0.08] pt-6 text-white/35 sm:flex-row sm:items-center sm:justify-between lg:mt-0">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em]">
            One workspace. Every practice.
          </span>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px]">
            {['Property', 'Insurance', 'Automotive', 'Travel', 'Sales', 'Legal'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
