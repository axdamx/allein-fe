import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthForm } from '@/components/auth/auth-form'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // Already logged in → redirect to dashboard
    if (context.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return <AuthForm />
}
