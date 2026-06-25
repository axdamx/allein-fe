'use client'

import { motion } from 'framer-motion'
import { SectionLabel } from './section-label'

const TESTIMONIALS = [
  {
    name: 'John Doe',
    role: 'CEO, Global Retail',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=face',
    quote:
      'Their AI solutions are a game-changer. We\'ve seen significant improvements in campaign performance and ROI.',
  },
  {
    name: 'Celine Doe',
    role: 'CMO, Tech Innovators',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=face',
    quote:
      'The insights provided by their platform have revolutionized our marketing strategy and execution.',
  },
  {
    name: 'Mike Doe',
    role: 'Marketing Director, HealthCo',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=face',
    quote:
      'Their expertise in AI marketing is unmatched. We highly recommend their services for future-proofing your brand.',
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-white px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl text-center">
        <SectionLabel className="text-black/40">TESTIMONIALS</SectionLabel>
        <h2 className="text-4xl font-semibold leading-tight tracking-tight text-black md:text-5xl">
          What our clients say.
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              className="rounded-3xl bg-[#F2EEEA] p-8 text-left"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="flex items-center gap-4">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="size-12 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-black">{t.name}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-[2px] text-black/40">
                    {t.role}
                  </div>
                </div>
              </div>
              <p className="mt-5 leading-relaxed text-black/70">
                &ldquo;{t.quote}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
