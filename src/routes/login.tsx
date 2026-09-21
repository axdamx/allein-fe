import { createFileRoute, redirect } from '@tanstack/react-router'

import { LoginPage } from '@/components/auth/login-page'

type LoginSearch = {
  auth_error?: 'google_cancelled' | 'google_unavailable' | 'google_failed'
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const value = search.auth_error
    if (
      value === 'google_cancelled' ||
      value === 'google_unavailable' ||
      value === 'google_failed'
    ) {
      return { auth_error: value }
    }
    return {}
  },
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})
