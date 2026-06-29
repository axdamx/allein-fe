import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateClient } from '@/hooks/use-clients'
import { CLIENT_STATUSES } from '@/server/clients'
import type { ClientStatus } from '@/server/clients'

export const ClientStatusDropdown = ({ clientId }: { clientId: string }) => {
  const updateClient = useUpdateClient()
  return (
    <Select
      value={updateClient.isPending ? undefined : undefined}
      onValueChange={(v) =>
        updateClient.mutate({
          id: clientId,
          status: v as ClientStatus,
        })
      }
    >
      <SelectTrigger className="w-36">
        <SelectValue placeholder="Change status" />
      </SelectTrigger>
      <SelectContent>
        {CLIENT_STATUSES.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
