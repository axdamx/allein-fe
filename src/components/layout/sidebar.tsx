import type { ComponentType } from 'react'
import {
  BarChart3,
  Bot,
  Brain,
  Calendar,
  ChevronRight,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

import { Brand } from '@/components/brand'
import { PlanBadge } from '@/components/billing/plan-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getLucideIcon } from '@/lib/icons'
import type { PlanTier } from '@/lib/plans'

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  to: string
  disabled?: boolean
  badge?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
      { label: 'Chat', icon: MessageSquare, to: '/chat' },
      { label: 'Agents', icon: Bot, to: '/agents' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { label: 'CRM', icon: Users, to: '/crm/leads' },
      { label: 'Planner', icon: Calendar, to: '/planner' },
      { label: 'Goals', icon: Target, to: '/goals' },
    ],
  },
  {
    label: 'Create',
    items: [
      { label: 'Studio', icon: Sparkles, to: '/studio', disabled: true, badge: 'Coming soon' },
      { label: 'Knowledge', icon: Brain, to: '/knowledge-base' },
      { label: 'Analytics', icon: BarChart3, to: '/analytics' },
    ],
  },
]

const footerNav: NavItem[] = [
  { label: 'Settings', icon: Settings, to: '/settings' },
  { label: 'Support', icon: LifeBuoy, to: '/support' },
]

const isActive = (currentPath: string, to: string): boolean =>
  currentPath === to || currentPath.startsWith(`${to}/`)

interface ShellUser {
  userEmail?: string | null
  userName?: string | null
  userPlan?: PlanTier
  isAdmin?: boolean
  agentType?: {
    key: string
    label: string
    icon: string | null
    accent_color: string
  } | null
}

const NavLink = ({
  item,
  active,
  darkSurface = false,
}: {
  item: NavItem
  active?: boolean
  darkSurface?: boolean
}) => {
  const Icon = item.icon

  if (item.disabled) {
    return (
      <div
        aria-disabled="true"
        title={`${item.label} is coming soon`}
        className={cn(
          'flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium',
          darkSurface ? 'text-white/25' : 'text-muted-foreground/55',
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em]',
            darkSurface ? 'bg-[#F1663C]/12 text-[#F49A70]/70' : 'bg-[#F1663C]/10 text-[#C95735]',
          )}>
            {item.badge}
          </span>
        )}
      </div>
    )
  }

  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all',
        darkSurface
          ? active
            ? 'bg-[#F1663C] text-white shadow-[0_10px_24px_rgba(241,102,60,0.2)]'
            : 'text-white/48 hover:bg-white/[0.06] hover:text-white'
          : active
            ? 'bg-[#171713] text-white dark:bg-[#F1663C]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className={cn('size-4 shrink-0', darkSurface && !active && 'text-white/38 group-hover:text-[#F49A70]')} />
      <span className="flex-1">{item.label}</span>
      {active ? <ChevronRight className="size-3.5 opacity-55" /> : null}
    </Link>
  )
}

export const NavContent = ({
  isAdmin = false,
  darkSurface = false,
}: {
  isAdmin?: boolean
  darkSurface?: boolean
}) => {
  const currentPath = useRouterState({ select: (state) => state.location.pathname })

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p
            className={cn(
              'px-3 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em]',
              darkSurface ? 'text-white/22' : 'text-muted-foreground',
            )}
          >
            {group.label}
          </p>
          {group.items.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              active={!item.disabled && isActive(currentPath, item.to)}
              darkSurface={darkSurface}
            />
          ))}
        </div>
      ))}

      <div className={cn('mt-auto border-t pt-4', darkSurface ? 'border-white/[0.07]' : 'border-border')}>
        {footerNav.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            active={isActive(currentPath, item.to)}
            darkSurface={darkSurface}
          />
        ))}
        {isAdmin ? (
          <NavLink
            item={{ label: 'Admin', icon: Shield, to: '/admin' }}
            active={isActive(currentPath, '/admin')}
            darkSurface={darkSurface}
          />
        ) : null}
      </div>
    </nav>
  )
}

export const UserCard = ({
  userEmail,
  userName,
  userPlan = 'free',
  agentType,
  darkSurface = false,
}: Omit<ShellUser, 'isAdmin'> & { darkSurface?: boolean }) => {
  const displayName = userName ?? (userEmail ? userEmail.split('@')[0] : 'Guest')
  const initials = displayName.slice(0, 2).toUpperCase()
  const AgentIcon = agentType ? getLucideIcon(agentType.icon) : null

  return (
    <div
      className={cn(
        'm-3 flex items-center gap-3 rounded-2xl border p-3',
        darkSurface
          ? 'border-white/[0.07] bg-white/[0.035] text-white'
          : 'border-border bg-muted/40',
      )}
    >
      <Avatar className="size-9 border border-white/10">
        <AvatarFallback className={cn(darkSurface && 'bg-[#F1663C] text-white')}>
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold capitalize">{displayName}</p>
        {agentType ? (
          <div className="mt-0.5 flex items-center gap-1.5">
            {AgentIcon ? <AgentIcon className="size-3" style={{ color: agentType.accent_color }} /> : null}
            <p className={cn('truncate text-[10px]', darkSurface ? 'text-white/38' : 'text-muted-foreground')}>
              {agentType.label}
            </p>
          </div>
        ) : (
          <p className={cn('truncate text-[10px]', darkSurface ? 'text-white/38' : 'text-muted-foreground')}>
            {userEmail ?? 'Not signed in'}
          </p>
        )}
      </div>
      <PlanBadge tier={userPlan} className="shrink-0" />
    </div>
  )
}

export const Sidebar = ({
  userEmail,
  userName,
  userPlan = 'free',
  isAdmin = false,
  agentType,
}: ShellUser) => (
  <aside
    data-tour="sidebar"
    className="sticky top-0 hidden h-svh w-[264px] shrink-0 flex-col bg-[#171713] text-white lg:flex"
  >
    <div className="flex h-20 items-center px-6">
      <Brand inverse />
    </div>
    <div className="mx-5 h-px bg-white/[0.07]" />
    <NavContent isAdmin={isAdmin} darkSurface />
    <UserCard
      userEmail={userEmail}
      userName={userName}
      userPlan={userPlan}
      agentType={agentType}
      darkSurface
    />
  </aside>
)
