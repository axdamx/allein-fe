import type { ComponentType } from 'react'
import {
  BarChart3,
  Bot,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Brand } from '@/components/brand'
import { PlanBadge } from '@/components/billing/plan-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { PlanTier } from '@/lib/plans'

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  to: string
  active?: boolean
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', active: true },
  { label: 'Agents', icon: Bot, to: '/agents' },
  { label: 'Team', icon: Users, to: '/team' },
  { label: 'Analytics', icon: BarChart3, to: '/analytics' },
]

const footerNav: NavItem[] = [
  { label: 'Settings', icon: Settings, to: '/settings' },
  { label: 'Support', icon: LifeBuoy, to: '/support' },
]

export function Sidebar({
  userEmail,
  userName,
  userPlan = 'free',
}: {
  userEmail?: string | null
  userName?: string | null
  userPlan?: PlanTier
}) {
  const displayName = userName ?? (userEmail ? userEmail.split('@')[0] : 'Guest')
  const initials = displayName.slice(0, 2).toUpperCase()

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
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium capitalize">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {userEmail ?? 'Not signed in'}
          </p>
        </div>
        <PlanBadge tier={userPlan} className="shrink-0" />
      </div>
    </aside>
  )
}

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
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
    </Link>
  )
}
