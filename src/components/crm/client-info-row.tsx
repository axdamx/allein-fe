import { cn } from '@/lib/utils'

export const InfoRow = ({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  capitalize?: boolean
}) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span
        className={cn(
          'max-w-[60%] truncate text-right text-sm font-medium',
          capitalize && 'capitalize',
        )}
      >
        {value || '—'}
      </span>
    </div>
  )
}
