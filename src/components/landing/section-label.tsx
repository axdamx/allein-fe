import { cn } from '@/lib/utils'

export const SectionLabel = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
    <span
      className={cn(
        'mb-4 inline-block text-[11px] font-semibold uppercase tracking-[3px]',
        className,
      )}
    >
      {children}
    </span>
  )
