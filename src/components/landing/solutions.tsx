'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { SectionLabel } from './section-label'

const SOLUTIONS = [
  {
    title: 'AI-Driven Ad Campaigns',
    body: 'We craft compelling brand identities that resonate. From defining your voice and values to designing memorable logos and brand systems.',
    graphic: 'flowchart',
  },
  {
    title: 'Marketing Departments',
    body: 'We craft compelling brand identities that resonate. From defining your voice and values to designing memorable logos and brand systems.',
    graphic: 'dashboard',
  },
  {
    title: 'Cross-Functional Collaboration',
    body: 'We craft compelling brand identities that resonate. From defining your voice and values to designing memorable logos and brand systems.',
    graphic: 'none',
  },
  {
    title: 'Small to Large Businesses',
    body: 'We craft compelling brand identities that resonate. From defining your voice and values to designing memorable logos and brand systems.',
    graphic: 'flowchart',
  },
]

function FlowchartGraphic() {
  return (
    <svg
      viewBox="0 0 200 80"
      className="h-20 w-full opacity-40"
      fill="none"
      stroke="white"
      strokeWidth="1.5"
    >
      <circle cx="20" cy="40" r="8" />
      <circle cx="60" cy="20" r="6" />
      <circle cx="60" cy="60" r="6" />
      <circle cx="100" cy="40" r="8" />
      <circle cx="140" cy="20" r="6" />
      <circle cx="140" cy="60" r="6" />
      <circle cx="180" cy="40" r="8" />
      <path d="M28 40 L54 20" strokeDasharray="4 3" />
      <path d="M28 40 L54 60" strokeDasharray="4 3" />
      <path d="M66 20 L92 40" strokeDasharray="4 3" />
      <path d="M66 60 L92 40" strokeDasharray="4 3" />
      <path d="M108 40 L134 20" strokeDasharray="4 3" />
      <path d="M108 40 L134 60" strokeDasharray="4 3" />
    </svg>
  )
}

function DashboardGraphic() {
  return (
    <div className="flex h-20 w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="h-6 w-48 rounded-full bg-white/10" />
      <div className="flex flex-1 gap-2">
        <div className="h-4 flex-1 rounded bg-white/10" />
        <div className="h-4 w-8 rounded bg-white/10" />
      </div>
      <div className="flex gap-1">
        <span className="flex size-5 items-center justify-center rounded bg-white/10 text-xs text-white/40">
          +
        </span>
        <span className="flex size-5 items-center justify-center rounded bg-white/10 text-xs text-white/40">
          +
        </span>
      </div>
    </div>
  )
}

export function Solutions() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      id="solutions"
      ref={sectionRef}
      className="relative px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl md:grid md:grid-cols-2 md:gap-16">
        <div className="md:sticky md:top-32 md:h-fit">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <SectionLabel className="text-white/60">SOLUTIONS</SectionLabel>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Tailored for all
              <br />
              business sizes.
            </h2>
            <p className="mt-4 max-w-sm text-base leading-relaxed text-white/80">
              Discover how our AI-powered solutions can specifically benefit
              your marketing challenges and goals.
            </p>
          </motion.div>
        </div>

        <div className="mt-12 flex flex-col gap-6 md:mt-0">
          {SOLUTIONS.map((solution, i) => (
            <motion.div
              key={solution.title}
              className="overflow-hidden rounded-3xl border border-white/10 p-8"
              style={{
                background: 'rgba(40,20,10,0.35)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <h3 className="text-2xl font-semibold text-white md:text-3xl">
                {solution.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-white/80">
                {solution.body}
              </p>
              <div className="mt-6">
                {solution.graphic === 'flowchart' && <FlowchartGraphic />}
                {solution.graphic === 'dashboard' && <DashboardGraphic />}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
