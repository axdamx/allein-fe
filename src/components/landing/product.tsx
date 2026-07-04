'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  MessagesSquare,
  KanbanSquare,
  Clapperboard,
  Bell,
  FileText,
  BarChart3,
  Send,
} from 'lucide-react'
import { SectionLabel } from './section-label'

const MODULES = [
  {
    icon: MessagesSquare,
    title: 'AI chat assistant',
    body: 'Streaming AI chat with memory per conversation. Answers from your own documents.',
  },
  {
    icon: KanbanSquare,
    title: 'Lead & CRM',
    body: 'Kanban pipeline and deal tracking — stages configured per agent type.',
  },
  {
    icon: Clapperboard,
    title: 'Marketing studio',
    body: 'AI generates images & video, writes captions, and schedules social posts.',
  },
  {
    icon: Bell,
    title: 'Reminders & alerts',
    body: 'Renewal alerts, follow-ups, and milestone reminders sent automatically.',
  },
  {
    icon: FileText,
    title: 'Document intelligence',
    body: 'Upload PDFs — AI reads them and answers questions from them instantly.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard & reports',
    body: 'KPI cards, pipeline charts, commission forecast, and social analytics.',
  },
  {
    icon: Send,
    title: 'WhatsApp & Telegram',
    body: 'Same AI, same memory, across every channel your clients already use.',
  },
]

export const Product = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      id="product"
      ref={sectionRef}
      data-nav-theme="light"
      className="bg-white px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel className="text-black/40">PRODUCT</SectionLabel>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-black md:text-5xl">
            Seven modules. One dashboard.
            <br />
            Every agent type.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-black/60">
            No app-switching, no separate bots — everything shares memory. One
            agent, all tools, full context.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.title}
              className={
                i === 6
                  ? 'flex flex-col rounded-3xl bg-black p-7 text-white sm:col-span-2 lg:col-span-1'
                  : 'flex flex-col rounded-3xl bg-[#F7F3EF] p-7'
              }
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 4) * 0.08 }}
            >
              <m.icon className={i === 6 ? 'size-6 text-orange-300' : 'size-6 text-[#E8804A]'} />
              <h3 className="mt-4 text-base font-semibold">{m.title}</h3>
              <p
                className={
                  i === 6
                    ? 'mt-2 text-sm leading-relaxed text-white/70'
                    : 'mt-2 text-sm leading-relaxed text-black/55'
                }
              >
                {m.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
