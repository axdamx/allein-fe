/**
 * Landing-page motion components that contain JSX.
 *
 * Split from `src/lib/animations.ts` (which is `.ts`) because JSX requires a
 * `.tsx` extension. These re-export from the shared animation primitives.
 */
import {
  motion,
  useScroll,
  useSpring,
  useMotionValue,
} from 'framer-motion'
import { useRef, useCallback } from 'react'

/**
 * Top-of-page scroll progress bar. Brand-orange gradient, fixed, sits above
 * the navbar. scaleX is spring-smoothed.
 */
export const ScrollProgress = () => {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  })
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-orange-400 via-orange-500 to-orange-300"
    />
  )
}

/**
 * Magnetic-hover wrapper — children drift subtly toward the cursor.
 * Use on CTA buttons for a premium feel.
 */
export const MagneticButton = ({
  children,
  className,
  strength = 0.25,
}: {
  children: React.ReactNode
  className?: string
  strength?: number
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 15 })
  const sy = useSpring(y, { stiffness: 200, damping: 15 })

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const relX = e.clientX - rect.left - rect.width / 2
      const relY = e.clientY - rect.top - rect.height / 2
      x.set(relX * strength)
      y.set(relY * strength)
    },
    [x, y, strength],
  )

  const onMouseLeave = useCallback(() => {
    x.set(0)
    y.set(0)
  }, [x, y])

  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  )
}
