import { cn } from '@/lib/utils'

export const KeyRow = ({
  label,
  description,
  status,
}: {
  label: string
  description: string
  status: 'configured' | 'missing'
}) => {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
          status === 'configured'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-red-500/10 text-red-600 dark:text-red-400',
        )}
      >
        <span
          className={cn(
            'size-1.5 rounded-full',
            status === 'configured' ? 'bg-emerald-500' : 'bg-red-500',
          )}
        />
        {status === 'configured' ? 'Active' : 'Missing'}
      </span>
    </div>
  )
}
