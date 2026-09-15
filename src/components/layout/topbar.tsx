'use client'

import { useState } from 'react'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, LogOut, Menu, MessageCircle, Settings, User } from 'lucide-react'
import { toast } from 'sonner'

import { logoutFn } from '@/server/auth'
import { Brand } from '@/components/brand'
import { NavContent, UserCard } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { PlanTier } from '@/lib/plans'

const initialsFromEmail = (email: string) => email.split('@')[0].slice(0, 2).toUpperCase()

const routeLabel = (pathname: string) => {
  if (pathname.startsWith('/crm')) return 'Client relationships'
  if (pathname.startsWith('/studio')) return 'Marketing Studio'
  if (pathname.startsWith('/knowledge-base')) return 'Knowledge base'
  if (pathname.startsWith('/chat')) return 'AI assistant'
  if (pathname.startsWith('/agents')) return 'AI agents'
  if (pathname.startsWith('/planner')) return 'Planner'
  if (pathname.startsWith('/goals')) return 'Goals'
  if (pathname.startsWith('/analytics')) return 'Analytics'
  if (pathname.startsWith('/settings')) return 'Settings'
  if (pathname.startsWith('/support')) return 'Support'
  if (pathname.startsWith('/admin')) return 'Administration'
  return 'Command center'
}

interface TopbarUser {
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

export const Topbar = ({ userEmail, userName, userPlan, isAdmin, agentType }: TopbarUser) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleSignOut = async () => {
    const result = await logoutFn()
    if (result?.error) {
      toast.error(result.message)
      return
    }
    toast.success('Signed out')
    await router.invalidate()
    queryClient.clear()
    router.navigate({ to: '/login' })
  }

  const displayName = userName ?? userEmail ?? 'Guest'
  const initials = userEmail ? initialsFromEmail(userEmail) : '?'

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center gap-3 border-b border-[#171713]/7 bg-[#F3EEE7]/88 px-4 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#10100D]/88 sm:px-6 lg:px-8">
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl border border-black/[0.07] bg-white/45 lg:hidden dark:border-white/10 dark:bg-white/[0.04]"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="flex w-72 flex-col bg-[#F8F4ED] p-0 dark:bg-[#171713]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-20 items-center px-6">
            <Brand className="dark:text-white" />
          </div>
          <div className="mx-5 h-px bg-black/[0.07] dark:bg-white/[0.07]" />
          <div onClick={() => setMobileNavOpen(false)} className="flex min-h-0 flex-1 flex-col">
            <NavContent isAdmin={isAdmin} />
          </div>
          <UserCard
            userEmail={userEmail}
            userName={userName}
            userPlan={userPlan}
            agentType={agentType}
          />
        </SheetContent>
      </Sheet>

      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F1663C]">Allein workspace</p>
        <p className="mt-0.5 truncate text-sm font-semibold tracking-[-0.02em]">{routeLabel(pathname)}</p>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          className="hidden h-10 items-center gap-2 rounded-full border border-black/[0.07] bg-white/45 px-4 text-xs font-medium text-muted-foreground hover:bg-white/75 md:flex dark:border-white/10 dark:bg-white/[0.04]"
          asChild
        >
          <Link to="/chat">
            <MessageCircle className="size-3.5 text-[#F1663C]" />
            Ask Allein
            <span className="ml-2 rounded-md border border-black/8 px-1.5 py-0.5 text-[9px] dark:border-white/10">AI</span>
          </Link>
        </Button>
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-11 gap-2 rounded-full px-1.5 sm:px-2">
              <Avatar className="size-8 border border-black/8 dark:border-white/10">
                <AvatarFallback className="bg-[#171713] text-[10px] font-semibold text-white dark:bg-[#F1663C]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-28 truncate text-xs font-semibold capitalize sm:inline">{displayName}</span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            <DropdownMenuLabel className="truncate px-2 py-2 text-xs">{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-xl">
              <Link to="/settings">
                <User className="size-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl">
              <Link to="/settings">
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="rounded-xl"
              onSelect={(event) => {
                event.preventDefault()
                void handleSignOut()
              }}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
