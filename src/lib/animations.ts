import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  animate as fmAnimate,
  type Variants,
  type HTMLMotionProps,
  type Variant,
} from 'framer-motion'
import { useState, useEffect } from 'react'

export { motion, AnimatePresence }
export type { Variants, HTMLMotionProps, Variant }

export const ease = [0.16, 1, 0.3, 1] as const

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease } },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease } },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
}

export const iconSwap: Variants = {
  initial: { rotate: -90, opacity: 0, scale: 0.5 },
  animate: { rotate: 0, opacity: 1, scale: 1, transition: { duration: 0.3, ease } },
  exit: { rotate: 90, opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
}

// ---------------------------------------------------------------------------
// Landing-page motion helpers
// ---------------------------------------------------------------------------

/** Spring-eased variant for card grids — feels snappier than the default tween. */
export const springStaggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 18 },
  },
}

/** While-hover lift for cards — pair with `whileHover` on a motion.div. */
export const cardHover = {
  y: -6,
  transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
}

/**
 * Per-word reveal variant for headlines. Wrap each word in a `<motion.span>`,
 * and set the parent to `variants={wordContainer}`.
 */
export const wordContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
}

export const wordItem: Variants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.4, ease },
  },
}

/** Split a string into words for staggered reveal. Preserves whitespace. */
export const splitWords = (text: string) => text.split(' ')

// NOTE: ScrollProgress and MagneticButton (JSX components) live in
// src/components/landing/motion-components.tsx — they can't be in this .ts
// file because JSX requires a .tsx extension.

/**
 * Animated count-up hook. Returns a rounded integer string that animates from 0
 * to `target` when `active` becomes true. Uses framer-motion's `animate()`.
 *
 * Pass the raw numeric target; the hook returns a display string (it won't
 * re-render on every frame — it updates a motion value and subscribes).
 */
export const useCountUp = (target: number, active: boolean, duration = 1.4) => {
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!active) return
    const controls = fmAnimate(mv, target, {
      duration,
      ease,
      onUpdate: (v) => setDisplay(Math.round(v).toString()),
    })
    return () => controls.stop()
  }, [mv, target, active, duration])

  return display
}

/**
 * Smooth-scroll to a section by id/hash. Accounts for the fixed navbar height.
 * Falls back to default behavior if the element isn't found.
 */
export const scrollToSection = (href: string) => {
  const id = href.startsWith('#') ? href.slice(1) : href
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Re-export hooks that landing components need
export { useScroll, useTransform, useMotionValueEvent }
