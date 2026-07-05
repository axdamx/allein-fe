import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Menu, Settings, User } from 'lucide-react'
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
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { motion } from '@/lib/animations'
import type { PlanTier } from '@/lib/plans'

const initialsFromEmail = (email: string) => {
  const name = email.split('@')[0]
  return name.slice(0, 2).toUpperCase()
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
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-16 items-center gap-3 border-b bg-background px-4 lg:px-6"
    >
      {/* Mobile nav trigger — sidebar is hidden below lg, so this is the
          only way to navigate on small screens. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 p-0">
          {/* Visually-hidden title for a11y (Sheet is a Dialog under the hood). */}
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-16 items-center px-6">
            <Brand />
          </div>
          <Separator />
          {/* Close on navigation: each Link inside NavContent triggers a
              route change; we close the sheet on openChange via state. */}
          <div
            onClick={() => setMobileNavOpen(false)}
            className="flex flex-1 flex-col"
          >
            <NavContent isAdmin={isAdmin} />
          </div>
          <Separator />
          <UserCard
            userEmail={userEmail}
            userName={userName}
            userPlan={userPlan}
            agentType={agentType}
          />
        </SheetContent>
      </Sheet>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="truncate">
              {displayName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <User className="size-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                handleSignOut()
              }}
            >
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  )
}
