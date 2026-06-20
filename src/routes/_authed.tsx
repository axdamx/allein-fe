import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AuthForm } from '@/components/auth/auth-form'

export const Route = createFileRoute('/_authed')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
  errorComponent: ({ error }) => {
    // If the redirect didn't catch it, show login form as fallback
    if (error.message === 'Not authenticated') {
      return <AuthForm />
    }
    throw error
  },
})
