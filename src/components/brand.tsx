import { Bot } from 'lucide-react'

import { cn } from '@/lib/utils'

export const Brand = ({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) => (
  <div className={cn('flex items-center gap-2', className)}>
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Bot className="size-5" />
      </div>
      {showText ? (
        <span className="text-lg font-semibold tracking-tight">Allein</span>
      ) : null}
    </div>
  )
