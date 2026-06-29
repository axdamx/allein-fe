import { ArrowRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Hero = () => {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden px-6 pt-24">
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start gap-6 md:flex-row md:items-center md:gap-16">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white md:text-7xl">
            AI-Powered
            <br />
            Marketing Agency
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
            Transform your marketing with AI-driven solutions. From campaign
            automation to intelligent analytics, we help businesses scale
            smarter.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
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
          </div>
        </motion.div>
      </div>
    </section>
  )
}
