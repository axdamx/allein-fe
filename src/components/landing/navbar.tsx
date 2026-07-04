'use client'

import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useIsWhiteSection } from './use-white-section'

const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Product', href: '#product' },
  { label: 'Why Allein', href: '#why' },
  { label: 'Pricing', href: '#pricing' },
]

export const Navbar = () => {
  const isWhite = useIsWhiteSection()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isWhite
          ? 'bg-white/80 text-black shadow-sm backdrop-blur-md'
          : 'bg-transparent text-white',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-black text-white">
            A
          </span>
          Allein AI
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm transition-opacity hover:opacity-70"
            >
              {link.label}
            </a>
          ))}
          <Link to="/login">
            <Button className="rounded-full bg-black text-white hover:bg-black/90">
              Start Free
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-white">
                <ArrowRight className="size-3 text-black" />
              </span>
            </Button>
          </Link>
        </div>

        <button
          className="flex flex-col gap-1.5 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={cn(
              'block h-0.5 w-6 transition-all',
              isWhite ? 'bg-black' : 'bg-white',
            )}
          />
          <span
            className={cn(
              'block h-0.5 w-6 transition-all',
              isWhite ? 'bg-black' : 'bg-white',
            )}
          />
          <span
            className={cn(
              'block h-0.5 w-6 transition-all',
              isWhite ? 'bg-black' : 'bg-white',
            )}
          />
        </button>
      </div>

      {mobileOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 flex flex-col gap-4 px-6 pb-6 md:hidden',
            isWhite ? 'bg-white' : 'bg-[#2A1408]',
          )}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm transition-opacity hover:opacity-70',
                isWhite ? 'text-black' : 'text-white',
              )}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button className="w-full rounded-full bg-black text-white hover:bg-black/90">
              Start Free
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-white">
                <ArrowRight className="size-3 text-black" />
              </span>
            </Button>
          </Link>
        </div>
      )}
    </nav>
  )
}
