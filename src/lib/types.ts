import type { ComponentType } from 'react'

/**
 * Shared types used across the app.
 * Extracted from the old mock data so real data can use the same shapes.
 */

export interface Stat {
  id: string
  label: string
  value: string
  delta: number
  trend: 'up' | 'down' | 'flat'
  icon: ComponentType<{ className?: string }>
}
