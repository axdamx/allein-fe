import { cn } from '@/lib/utils'

export const Brand = ({
  className,
  showText = true,
  inverse = false,
}: {
  className?: string
  showText?: boolean
  inverse?: boolean
}) => (
  <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'relative flex size-9 items-center justify-center overflow-hidden rounded-xl text-sm font-black',
          inverse ? 'bg-white text-[#171713]' : 'bg-[#171713] text-white dark:bg-white dark:text-[#171713]',
        )}
      >
        <span className="relative z-10">A</span>
        <span className="absolute -right-2 -top-2 size-5 rounded-full bg-[#F1663C]" />
      </div>
      {showText ? (
        <span className="text-[17px] font-semibold tracking-[-0.03em]">
          Allein<span className="text-[#F1663C]">.</span>
        </span>
      ) : null}
    </div>
  )
