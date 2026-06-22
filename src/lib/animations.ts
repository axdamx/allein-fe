import {
  motion,
  AnimatePresence,
  type Variants,
  type HTMLMotionProps,
  type Variant,
} from 'framer-motion'

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
