'use client'

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { scrollToSection } from '@/lib/animations'

const NAV_LINKS = [
  { label: 'How it works', href: '#workflow' },
  { label: 'Platform', href: '#product' },
  { label: 'Built for', href: '#built-for' },
  { label: 'Pricing', href: '#pricing' },
]

export const LandingLogo = ({ inverse = false }: { inverse?: boolean }) => (
  <span className="flex items-center gap-2.5">
    <span
      className={`relative flex size-9 items-center justify-center overflow-hidden rounded-xl text-sm font-black ${
        inverse ? 'bg-white text-[#171713]' : 'bg-[#171713] text-white'
      }`}
    >
      <span className="relative z-10">A</span>
      <span className="absolute -right-2 -top-2 size-5 rounded-full bg-[#F1663C]" />
    </span>
    <span className="text-[17px] font-semibold tracking-[-0.03em]">
      Allein<span className="text-[#F1663C]">.</span>
    </span>
  </span>
)

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavClick = useCallback(
    (event: React.MouseEvent, href: string) => {
      event.preventDefault()
      scrollToSection(href)
      setMobileOpen(false)
    },
    [],
  )

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-5">
      <nav className="mx-auto max-w-7xl rounded-2xl border border-black/[0.07] bg-[#F9F6F0]/90 px-4 shadow-[0_12px_50px_rgba(30,24,18,0.09)] backdrop-blur-xl sm:px-5">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" aria-label="Allein home" className="shrink-0">
            <LandingLogo />
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => handleNavClick(event, link.href)}
                className="text-[13px] font-medium text-[#171713]/60 transition-colors hover:text-[#171713]"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to="/login"
              className="rounded-full px-4 py-2.5 text-sm font-medium text-[#171713]/65 transition-colors hover:text-[#171713]"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-[#171713] px-4 py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              Start free
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full border border-black/10 sm:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {mobileOpen ? (
            <motion.div
              id="mobile-navigation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden sm:hidden"
            >
              <div className="border-t border-black/[0.07] py-3">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(event) => handleNavClick(event, link.href)}
                    className="block rounded-xl px-2 py-3 text-sm font-medium text-[#171713]/70 hover:bg-black/[0.04] hover:text-[#171713]"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#171713] px-4 py-3 text-sm font-medium text-white"
                >
                  Start free <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </header>
  )
}
