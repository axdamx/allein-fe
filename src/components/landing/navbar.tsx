'use client'

import { useState, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { scrollToSection } from '@/lib/animations'

const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Product', href: '#product' },
  { label: 'Why Allein', href: '#why' },
  { label: 'Pricing', href: '#pricing' },
]

export const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      e.preventDefault()
      scrollToSection(href)
      setMobileOpen(false)
    },
    [],
  )

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 text-white backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-black">
            A
          </span>
          Allein AI
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm transition-opacity hover:opacity-70"
            >
              {link.label}
            </a>
          ))}
          <Link to="/login">
            <Button className="rounded-full bg-white text-black hover:bg-white/90">
              Start Free
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-black">
                <ArrowRight className="size-3 text-white" />
              </span>
            </Button>
          </Link>
        </div>

        <button
          className="flex flex-col gap-1.5 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className="block h-0.5 w-6 bg-white" />
          <span className="block h-0.5 w-6 bg-white" />
          <span className="block h-0.5 w-6 bg-white" />
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 flex flex-col gap-4 bg-[#2A1408] px-6 pb-6 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-sm text-white transition-opacity hover:opacity-70"
            >
              {link.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button className="w-full rounded-full bg-white text-black hover:bg-white/90">
              Start Free
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-black">
                <ArrowRight className="size-3 text-white" />
              </span>
            </Button>
          </Link>
        </div>
      )}
    </nav>
  )
}
