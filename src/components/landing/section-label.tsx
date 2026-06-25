import { cn } from '@/lib/utils'

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'mb-4 inline-block text-[11px] font-semibold uppercase tracking-[3px]',
        className,
      )}
    >
      {children}
    </span>
  )
}
