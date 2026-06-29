import { Label } from '@/components/ui/label'
import { getLucideIcon } from '@/lib/icons'

export const AgentTypeField = ({
  typeInfo,
}: {
  typeInfo: {
    key: string
    label: string
    description: string | null
    icon: string | null
    accent_color: string
  }
}) => {
  const Icon = getLucideIcon(typeInfo.icon)
  return (
    <div className="space-y-2">
      <Label>Agent Type</Label>
      <div
        className="flex items-center gap-3 rounded-lg border p-3"
        style={{ borderColor: `${typeInfo.accent_color}30` }}
      >
        <div
          className="flex size-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${typeInfo.accent_color}20` }}
        >
          <Icon className="size-5" style={{ color: typeInfo.accent_color }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{typeInfo.label}</p>
          <p className="text-xs text-muted-foreground">
            {typeInfo.description}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Locked</span>
      </div>
    </div>
  )
}
