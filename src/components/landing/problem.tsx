'use client'

import { motion } from 'framer-motion'
import { ArrowDownRight, Copy, Layers3, TimerReset } from 'lucide-react'
import { SectionLabel } from './section-label'

const PROBLEMS = [
  {
    icon: Layers3,
    number: '01',
    title: 'Your work is scattered',
    body: 'Conversations, client notes, files, and content live in different tools that never share context.',
  },
  {
    icon: TimerReset,
    number: '02',
    title: 'Follow-ups depend on memory',
    body: 'The next best action gets buried under admin, and warm leads quietly turn cold.',
  },
  {
    icon: Copy,
    number: '03',
    title: 'Every task starts from zero',
    body: 'The same facts are copied into messages, captions, proposals, and reminders again and again.',
  },
]

export const Problem = () => (
  <section id="problem" className="scroll-mt-28 px-5 py-24 sm:px-8 sm:py-32">
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionLabel>THE REAL BOTTLENECK</SectionLabel>
          <h2 className="max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            You became an agent to advise people.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="border-l border-[#171713]/15 pl-6 lg:ml-auto lg:max-w-lg"
        >
          <p className="text-xl leading-8 text-[#171713]/58 sm:text-2xl sm:leading-9">
            Not to chase tabs, rewrite the same message, or wonder which client
            needed a reply yesterday.
          </p>
        </motion.div>
      </div>

      <div className="mt-16 grid border-y border-[#171713]/12 md:grid-cols-3">
        {PROBLEMS.map((problem, index) => (
          <motion.article
            key={problem.number}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group relative border-b border-[#171713]/12 py-8 last:border-b-0 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#171713]/30">{problem.number}</span>
              <span className="flex size-10 items-center justify-center rounded-full border border-[#171713]/10 transition-colors group-hover:border-[#F1663C]/30 group-hover:bg-[#F1663C] group-hover:text-white">
                <problem.icon className="size-4" />
              </span>
            </div>
            <h3 className="mt-12 text-xl font-semibold tracking-[-0.025em]">{problem.title}</h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#171713]/50">{problem.body}</p>
          </motion.article>
        ))}
      </div>

      <div className="mt-7 flex justify-end">
        <a href="#workflow" className="group inline-flex items-center gap-2 text-sm font-semibold">
          There is a better flow
          <ArrowDownRight className="size-4 text-[#F1663C] transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
        </a>
      </div>
    </div>
  </section>
)
