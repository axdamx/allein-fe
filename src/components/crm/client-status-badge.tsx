import { Badge } from '@/components/ui/badge'
import type { ClientStatus } from '@/server/clients'
import { CLIENT_STATUSES } from '@/server/clients'

export const StatusBadge = ({ status }: { status: ClientStatus }) => {
  const cfg = CLIENT_STATUSES.find((s) => s.value === status)
  if (!cfg) return null
  return (
    <Badge
      className="text-xs"
      style={{
        backgroundColor: cfg.color + '20',
        color: cfg.color,
        borderColor: cfg.color + '40',
      }}
      variant="outline"
    >
      {cfg.label}
    </Badge>
  )
}
