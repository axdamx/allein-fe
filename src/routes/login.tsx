import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthForm } from '@/components/auth/auth-form'
import { Brand } from '@/components/brand'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-svh">
      {/* Left: animated brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Animated orbs */}
        <div className="pointer-events-none absolute inset-0 select-none">
          <div className="absolute -left-16 -top-16 size-80 animate-float rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-1/3 -right-8 size-96 animate-float-delayed rounded-full bg-sky-500/15 blur-3xl" />
          <div className="absolute -bottom-20 left-1/4 size-64 animate-float-slow rounded-full bg-violet-500/10 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Brand className="text-white" />
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">
            AI agents that
            <br />
            grow your business
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Allein automates lead generation, follow-ups, and content creation
            so you can focus on closing deals.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/30">
          &copy; {new Date().getFullYear()} Allein
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex w-full items-center justify-center bg-background p-4 lg:w-1/2">
        <div className="flex w-full max-w-sm flex-col items-center">
          <div className="mb-8 flex justify-center lg:hidden">
            <Brand />
          </div>
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
