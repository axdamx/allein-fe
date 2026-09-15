'use client'

import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, MessageSquareText, Zap } from 'lucide-react'
import { SectionLabel } from './section-label'

const STEPS = [
  {
    icon: MessageSquareText,
    kicker: 'Capture',
    title: 'Start with what you already have',
    body: 'Bring in a client message, a lead, or a document. Allein puts the context in one place.',
    chip: 'New enquiry received',
  },
  {
    icon: BrainCircuit,
    kicker: 'Understand',
    title: 'Your AI connects the dots',
    body: 'It reads the history, understands the next action, and grounds answers in your own knowledge.',
    chip: 'Intent + context matched',
  },
  {
    icon: Zap,
    kicker: 'Act',
    title: 'Move the work forward',
    body: 'Draft the reply, update the pipeline, schedule the follow-up, or turn the brief into a campaign.',
    chip: '4 actions completed',
  },
]

export const Solution = () => (
  <section id="workflow" className="scroll-mt-28 px-3 py-3 sm:px-5 sm:py-5">
    <div className="relative overflow-hidden rounded-[28px] bg-[#E9DCCB] px-5 py-20 sm:rounded-[34px] sm:px-8 sm:py-28 lg:px-12">
      <div className="pointer-events-none absolute right-[-10rem] top-[-14rem] size-[30rem] rounded-full border-[80px] border-white/20" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <SectionLabel>HOW ALLEIN WORKS</SectionLabel>
            <h2 className="max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              One thought in.
              <span className="block text-[#F1663C]">Momentum out.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#171713]/55">
            Allein does more than generate text. It carries context from one
            task to the next, so every action compounds.
          </p>
        </motion.div>

        <div className="relative mt-16 grid gap-4 lg:grid-cols-3">
          <div className="absolute left-[16.6%] right-[16.6%] top-9 hidden h-px bg-[#171713]/15 lg:block" />
          {STEPS.map((step, index) => (
            <motion.article
              key={step.kicker}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-70px' }}
              transition={{ duration: 0.55, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[24px] border border-[#171713]/8 bg-[#F8F3EB]/75 p-6 shadow-[0_16px_40px_rgba(75,55,35,0.07)] backdrop-blur sm:p-7"
            >
              <div className="relative z-10 flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#171713] text-white">
                  <step.icon className="size-5" />
                </span>
                <span className="text-xs font-semibold text-[#171713]/25">0{index + 1}</span>
              </div>
              <div className="mt-10 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">
                {step.kicker}
              </div>
              <h3 className="mt-2 text-xl font-semibold leading-7 tracking-[-0.025em]">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#171713]/50">{step.body}</p>
              <div className="mt-8 flex items-center gap-2 rounded-xl border border-[#171713]/8 bg-white/55 px-3 py-2.5 text-[11px] font-medium text-[#171713]/60">
                <span className="size-1.5 rounded-full bg-[#61A44B]" />
                {step.chip}
                {index < STEPS.length - 1 ? <ArrowRight className="ml-auto size-3.5 text-[#171713]/25" /> : null}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  </section>
)
