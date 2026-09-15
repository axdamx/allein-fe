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
        'mb-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#F1663C]',
        className,
      )}
    >
      <span className="h-px w-5 bg-current opacity-60" />
      {children}
    </span>
  )
