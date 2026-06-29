import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AuthForm } from '@/components/auth/auth-form'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'

const AuthedLayout = () => {
  const { user } = Route.useRouteContext()

  if (user && !user.agent_type) {
    return <OnboardingModal />
  }

  return <Outlet />
}

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthedLayout,
  errorComponent: ({ error }) => {
    // If the redirect didn't catch it, show login form as fallback
    if (error.message === 'Not authenticated') {
      return (
        <div className="flex min-h-svh items-center justify-center bg-gradient-to-b from-muted/50 to-background p-4">
          <AuthForm />
        </div>
      )
    }
    throw error
  },
})
