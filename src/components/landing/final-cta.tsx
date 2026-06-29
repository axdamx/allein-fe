import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const FinalCta = () => {
  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-40">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.h2
          className="text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Grow with Creative Marketing Agency.
          <br />
          Start your journey today.
        </motion.h2>

        <motion.div
          className="mt-10 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Link to="/login">
            <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-opacity hover:opacity-90">
              Get Started
              <span className="flex size-5 items-center justify-center rounded-full bg-black/10">
                <ArrowRight className="size-3" />
              </span>
            </button>
          </Link>
          <a href="#solutions">
            <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white">
              Learn More
            </button>
          </a>
        </motion.div>
      </div>

      <footer className="relative z-10 mx-auto mt-32 flex max-w-7xl flex-col items-start justify-between gap-8 border-t border-white/10 pt-12 md:flex-row md:items-end">
        <div>
          <div className="text-lg font-semibold text-white">
            Creative Marketing Agency
          </div>
          <a
            href="mailto:contact@creativemarketing.com"
            className="mt-2 block text-sm text-white/60 transition-colors hover:text-white"
          >
            contact@creativemarketing.com
          </a>
        </div>

        <div className="flex gap-12">
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Menu
            </div>
            <div className="flex flex-col gap-2">
              {['Solutions', 'Features', 'AI Power', 'Pricing'].map(
                (item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {item}
                  </a>
                ),
              )}
            </div>
          </div>
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[3px] text-white/40">
              Socials
            </div>
            <div className="flex flex-col gap-2">
              {['Instagram', 'LinkedIn', 'X'].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </section>
  )
}
