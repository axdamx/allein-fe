'use client'

import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpenText,
  ImageIcon,
  KanbanSquare,
  MessageCircleMore,
  Send,
  Sparkles,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { SectionLabel } from './section-label'

const FEATURE_CARDS = [
  {
    icon: KanbanSquare,
    title: 'A CRM that thinks ahead',
    body: 'Keep every lead, conversation, task, and deal stage clear—without maintaining a second system.',
  },
  {
    icon: BookOpenText,
    title: 'Answers grounded in your work',
    body: 'Upload listings, policies, packages, and references. Your agent answers from what you trust.',
  },
  {
    icon: BellRing,
    title: 'Follow-up, handled',
    body: 'Turn promises into reminders and next actions before the conversation goes cold.',
  },
  {
    icon: Send,
    title: 'Meet clients where they are',
    body: 'Carry the same context across your dashboard, WhatsApp, and Telegram workflows.',
  },
]

export const Product = () => (
  <section id="product" className="scroll-mt-28 px-5 py-24 sm:px-8 sm:py-32">
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid gap-6 lg:grid-cols-[1fr_0.6fr] lg:items-end"
      >
        <div>
          <SectionLabel>THE PLATFORM</SectionLabel>
          <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            Everything connected.
            <span className="block text-[#171713]/30">Nothing to babysit.</span>
          </h2>
        </div>
        <p className="max-w-md text-base leading-7 text-[#171713]/52 lg:justify-self-end">
          A focused operating system for the work between a new enquiry and a
          closed client—not another pile of disconnected AI features.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-4 lg:grid-cols-12">
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-70px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] bg-[#171713] p-6 text-white sm:p-8 lg:col-span-7 lg:min-h-[520px]"
        >
          <div className="landing-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-[#F1663C]/20 blur-[70px]" />
          <div className="relative z-10 flex items-start justify-between gap-5">
            <div>
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#F1663C]">
                <Sparkles className="size-5" />
              </span>
              <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">AI Marketing Studio</h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
                Turn one simple brief into a campaign—copy, visual direction,
                storyboard, and publish-ready assets in one creative flow.
              </p>
            </div>
            <span className="hidden rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40 sm:block">
              Create
            </span>
          </div>

          <div className="relative z-10 mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#262620] p-3 shadow-2xl sm:p-4">
            <div className="flex items-center gap-2 border-b border-white/[0.07] pb-3">
              <span className="size-2 rounded-full bg-[#F1663C]" />
              <span className="text-[10px] font-medium text-white/45">Campaign workspace</span>
              <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-1 text-[8px] text-white/35">Draft saved</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[0.82fr_1.18fr]">
              <div className="rounded-xl bg-black/15 p-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-white/28">Creative brief</p>
                <p className="mt-3 text-[11px] leading-5 text-white/68">
                  “Launch a warm, premium campaign for a Mont Kiara listing aimed at young families.”
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {['Instagram', 'Warm tone', 'BM + EN'].map((tag) => (
                    <span key={tag} className="rounded-full border border-white/[0.08] px-2 py-1 text-[8px] text-white/38">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-[0.8fr_1.2fr] gap-2">
                <div className="relative min-h-40 overflow-hidden rounded-xl bg-[#D8B697]">
                  <div className="absolute inset-x-3 bottom-3 rounded-lg bg-[#171713]/85 p-2 text-[8px] leading-3 text-white/70 backdrop-blur">
                    A quieter kind of city living.
                  </div>
                  <div className="absolute -right-6 -top-5 size-24 rounded-full bg-[#F7D5B7]/80" />
                  <ImageIcon className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-[#171713]/25" />
                </div>
                <div className="space-y-2">
                  {['Caption generated', 'Visual composed', 'Schedule suggested'].map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.25 + index * 0.1 }}
                      className="flex items-center gap-2 rounded-lg bg-black/15 px-2.5 py-2.5 text-[9px] text-white/50"
                    >
                      <span className="size-1.5 rounded-full bg-[#78C56E]" /> {item}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-70px' }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[28px] bg-[#F1663C] p-6 text-white sm:p-8 lg:col-span-5 lg:min-h-[520px]"
        >
          <div className="relative z-10">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/15">
              <MessageCircleMore className="size-5" />
            </span>
            <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">An assistant with context</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/68">
              Ask naturally. Allein can work across your CRM, documents, and
              daily plan without making you repeat the backstory.
            </p>
          </div>

          <div className="relative z-10 mt-10 space-y-3">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-3 text-xs leading-5 text-[#171713] shadow-xl">
              Who needs a follow-up today, and can you prepare the messages?
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/12 bg-[#B94A2A]/55 px-4 py-3 text-xs leading-5 text-white/85 backdrop-blur">
              You have 6 follow-ups. I prioritised 3 warm leads and drafted each
              message from their last conversation.
              <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[9px] text-white/55">
                <BarChart3 className="size-3" /> Read pipeline · 3 drafts ready
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-3 text-[10px] text-white/45 backdrop-blur sm:bottom-8 sm:left-8 sm:right-8">
            Ask Allein anything...
            <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-white text-[#F1663C]">
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </motion.article>

        {FEATURE_CARDS.map((feature, index) => (
          <motion.article
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
            className="group rounded-[24px] border border-[#171713]/8 bg-white/55 p-6 shadow-[0_12px_36px_rgba(36,28,18,0.04)] lg:col-span-3"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#E9DCCB] transition-colors group-hover:bg-[#F1663C] group-hover:text-white">
              <feature.icon className="size-4.5" />
            </span>
            <h3 className="mt-9 text-lg font-semibold leading-6 tracking-[-0.025em]">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[#171713]/48">{feature.body}</p>
          </motion.article>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link to="/login" className="group inline-flex items-center gap-2 text-sm font-semibold">
          Explore your free workspace
          <ArrowUpRight className="size-4 text-[#F1663C] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  </section>
)
