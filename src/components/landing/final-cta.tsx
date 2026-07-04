import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const FinalCta = () => {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-40">
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute left-1/4 top-10 size-80 animate-float-slow rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 animate-float rounded-full bg-orange-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.h2
          className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Let&apos;s build the AI operating system every Malaysian agent
          deserves.
        </motion.h2>

        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link to="/login">
            <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]">
              Start free
              <span className="flex size-5 items-center justify-center rounded-full bg-black">
                <ArrowRight className="size-3 text-white" />
              </span>
            </button>
          </Link>
          <a href="#pricing">
            <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white">
              View pricing
            </button>
          </a>
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

        <div className="flex gap-12">
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Menu
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Problem', href: '#problem' },
                { label: 'Product', href: '#product' },
                { label: 'Why Allein', href: '#why' },
                { label: 'Pricing', href: '#pricing' },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </section>
  )
}
