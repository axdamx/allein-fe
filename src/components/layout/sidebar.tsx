import type { ComponentType } from 'react'
import {
  BarChart3,
  Bot,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
} from 'lucide-react'

import { Brand } from '@/components/brand'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  active?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Agents', icon: Bot },
  { label: 'Team', icon: Users },
  { label: 'Analytics', icon: BarChart3 },
]

const footerNav: NavItem[] = [
  { label: 'Settings', icon: Settings },
  { label: 'Support', icon: LifeBuoy },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-16 items-center px-6">
        <Brand />
      </div>
      <Separator />
      <nav className="flex flex-1 flex-col gap-1 p-4">
        <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
          General
        </p>
        {mainNav.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </nav>
      <Separator />
      <nav className="flex flex-col gap-1 p-4">
        {footerNav.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </nav>
      <Separator />
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-9">
          <AvatarImage src="" alt="Sam Hari" />
          <AvatarFallback>SH</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Sam Hari</p>
          <p className="truncate text-xs text-muted-foreground">
            sam@allein.ai
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          Pro
        </Badge>
      </div>
    </aside>
  )
}

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <a
      href="#"
      aria-current={item.active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        item.active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="size-4" />
      {item.label}
    </a>
  )
}
