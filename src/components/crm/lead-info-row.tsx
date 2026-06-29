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
      <span className={cn('text-right text-sm font-medium truncate max-w-[60%]', capitalize && 'capitalize')}>
        {value || '—'}
      </span>
    </div>
  )
}
