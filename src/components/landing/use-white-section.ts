'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when a "light" (white-background) section currently sits at the
 * viewport's center line. Sections opt in by setting `data-nav-theme="light"`.
 *
 * The -50%/-50% rootMargin collapses the observation band to a single line at
 * the middle of the screen, so the theme flips exactly when one section hands
 * off to another — used by the Navbar to flip text contrast.
 */
export const useIsWhiteSection = () => {
  const [isWhite, setIsWhite] = useState(false)

  useEffect(() => {
    const lightSections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-nav-theme="light"]'),
    )
    if (lightSections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const anyVisible = entries.some((entry) => entry.isIntersecting)
        setIsWhite(anyVisible)
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )

    lightSections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return isWhite
}
