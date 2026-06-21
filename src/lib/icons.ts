import * as LucideIcons from 'lucide-react'

/**
 * Convert a kebab-case or snake_case icon name to PascalCase.
 * e.g. "trending-up" → "TrendingUp", "home" → "Home"
 */
function toPascalCase(s: string): string {
  return s
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Look up a lucide icon by its kebab-case name (as stored in the DB).
 * Returns a fallback (Bot) if the named icon doesn't exist.
 */
export function getLucideIcon(name: string | null | undefined) {
  if (!name) return LucideIcons.Bot
  const pascal = toPascalCase(name)
  const icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ className?: string; style?: React.CSSProperties }>
    >
  )[pascal]
  return icon ?? LucideIcons.Bot
}
