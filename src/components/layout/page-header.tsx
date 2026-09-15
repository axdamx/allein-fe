import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title: ReactNode
  description: ReactNode
  eyebrow?: string
  icon?: LucideIcon
  actions?: ReactNode
  className?: string
}

export const PageHeader = ({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) => (
  <header
    className={cn(
      'mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
      className,
    )}
  >
    <div className="min-w-0 max-w-3xl">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#F1663C]/12 text-[#E95F36] ring-1 ring-inset ring-[#F1663C]/15 dark:bg-[#F1663C]/15 dark:text-[#FF8B66]">
            <Icon className="size-[18px]" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E95F36] dark:text-[#FF8B66]">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate text-[1.75rem] font-semibold leading-none tracking-[-0.04em] sm:text-[2rem]">
            {title}
          </h1>
        </div>
      </div>
      <p className={cn('mt-3 max-w-2xl text-sm leading-6 text-[#716A61] dark:text-[#AAA298]', Icon && 'sm:ml-[52px]')}>
        {description}
      </p>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
)
