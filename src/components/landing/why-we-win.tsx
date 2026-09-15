'use client'

import { motion } from 'framer-motion'
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Languages,
  Plane,
  Scale,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { SectionLabel } from './section-label'

const PRACTICES = [
  { icon: Building2, label: 'Property' },
  { icon: ShieldCheck, label: 'Insurance' },
  { icon: CarFront, label: 'Automotive' },
  { icon: Plane, label: 'Travel' },
  { icon: BriefcaseBusiness, label: 'Sales' },
  { icon: Scale, label: 'Legal' },
]

const DIFFERENCES = [
  {
    icon: Languages,
    title: 'Local by default',
    body: 'Clear communication in Bahasa Malaysia and English, shaped around the channels clients already use.',
  },
  {
    icon: BadgeCheck,
    title: 'Grounded, not generic',
    body: 'Your uploaded knowledge and client context sit behind every useful answer and next action.',
  },
  {
    icon: UsersRound,
    title: 'Fits the practice you run',
    body: 'Pipelines, language, and workflows adapt across six agent verticals—not one generic SaaS template.',
  },
]

export const WhyWeWin = () => (
  <section id="built-for" className="scroll-mt-28 px-3 py-3 sm:px-5 sm:py-5">
    <div className="relative overflow-hidden rounded-[28px] bg-[#171713] px-5 py-20 text-white sm:rounded-[34px] sm:px-8 sm:py-28 lg:px-12">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute -bottom-52 -left-36 size-[34rem] rounded-full bg-[#F1663C]/18 blur-[110px]" />
      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-8 lg:grid-cols-[1fr_0.72fr] lg:items-end"
        >
          <div>
            <SectionLabel className="text-[#F49A70]">BUILT AROUND YOUR PRACTICE</SectionLabel>
            <h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              The intelligence of a big team.
              <span className="block text-white/32">The focus of one workspace.</span>
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-white/48 lg:justify-self-end">
            Allein is designed for relationship-driven work: fast responses,
            trusted advice, consistent follow-up, and content that stays on brand.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PRACTICES.map((practice, index) => (
            <motion.div
              key={practice.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.055 }}
              whileHover={{ y: -3 }}
              className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 transition-colors hover:border-[#F1663C]/35 hover:bg-[#F1663C]/10"
            >
              <practice.icon className="size-4 text-[#F49A70]" />
              <span className="mt-6 block text-sm font-medium">{practice.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 grid border-t border-white/[0.08] lg:grid-cols-3">
          {DIFFERENCES.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="border-b border-white/[0.08] py-8 last:border-b-0 lg:border-b-0 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
            >
              <item.icon className="size-5 text-[#F49A70]" />
              <h3 className="mt-8 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/43">{item.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  </section>
)
