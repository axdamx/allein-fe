import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Hero = () => {
  return (
    <section className="relative flex min-h-svh items-center overflow-hidden px-6 pt-24">
      {/* Ambient floating orbs for depth */}
      <div className="pointer-events-none absolute inset-0 select-none">
        <div className="absolute -left-16 top-24 size-80 animate-float rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-8 size-96 animate-float-delayed rounded-full bg-orange-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-start gap-10 md:flex-row md:items-center md:gap-16">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            For Agents, By Agents
          </div>

          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-7xl">
            The AI operating system for{' '}
            <span className="text-orange-200">agents</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-lg">
            One AI agent that talks to your clients on WhatsApp &amp; Telegram,
            answers from your own documents, creates marketing, and runs your
            CRM — built for Malaysia&apos;s property, insurance, travel &amp;
            sales agents.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/login">
              <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]">
                Start free
                <span className="flex size-5 items-center justify-center rounded-full bg-black">
                  <ArrowRight className="size-3 text-white" />
                </span>
              </button>
            </Link>
            <a href="#product">
              <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/60 hover:text-white">
                See how it works
              </button>
            </a>
          </div>

          {/* Trust row */}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
            <span className="flex items-center gap-2">
              <MessageCircle className="size-4" /> WhatsApp &amp; Telegram
            </span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>Speaks BM &amp; English</span>
            <span className="h-1 w-1 rounded-full bg-white/30" />
            <span>No credit card</span>
          </div>
        </motion.div>

        {/* Floating product preview card */}
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 40, rotateY: -8 }}
          animate={{ opacity: 1, y: 0, rotateY: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        >
          <div
            className="rounded-2xl border border-white/15 p-5 shadow-2xl"
            style={{ background: 'rgba(40,20,10,0.5)', backdropFilter: 'blur(16px)' }}
          >
            {/* Mock chat header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-green-500/20 text-xs font-semibold text-green-300">
                  WA
                </span>
                <div>
                  <div className="text-sm font-medium text-white">Siti — Property lead</div>
                  <div className="text-[11px] text-white/50">Online · WhatsApp</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                AUTO-REPLY
              </span>
            </div>

            {/* Mock chat messages */}
            <div className="mt-4 space-y-3">
              <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-white/15 px-3 py-2 text-sm text-white/90">
                Hi, is the condo in Mont Kiara still available?
              </div>
              <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-black/30 px-3 py-2 text-sm text-white/90">
                Hi Siti! Yes — 2 beds, RM 1.3M. Move-in ready. Want me to
                schedule a viewing this weekend?
              </div>
              <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-white/15 px-3 py-2 text-sm text-white/90">
                Yes please 🙏
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-white/40">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Viewing booked · reminder sent · lead added to CRM
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
