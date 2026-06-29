'use client'

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NAV_LINKS = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Features', href: '#benefits' },
  { label: 'AI Power', href: '#testimonials' },
  { label: 'Pricing', href: '#pricing' },
]

export const Navbar = () => {
  const [isWhite, setIsWhite] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const whiteSection = document.getElementById('testimonials')
    if (!whiteSection) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsWhite(entry.isIntersecting)
      },
      { threshold: 0 },
    )

    observer.observe(whiteSection)
    return () => observer.disconnect()
  }, [])

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
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Creative Marketing Agency
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
            <Button
              className={cn(
                'rounded-full',
                isWhite
                  ? 'bg-black text-white hover:bg-black/90'
                  : 'bg-white text-black hover:bg-white/90',
              )}
            >
              Get Started
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-black/10">
                <ArrowRight className="size-3" />
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
            <Button
              className={cn(
                'w-full rounded-full',
                isWhite
                  ? 'bg-black text-white hover:bg-black/90'
                  : 'bg-white text-black hover:bg-white/90',
              )}
            >
              Get Started
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-black/10">
                <ArrowRight className="size-3" />
              </span>
            </Button>
          </Link>
        </div>
      )}
    </nav>
  )
}
