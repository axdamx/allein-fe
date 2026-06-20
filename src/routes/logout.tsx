import { createFileRoute, redirect } from '@tanstack/react-router'
import { logoutFn } from '@/server/auth'

export const Route = createFileRoute('/logout')({
  preload: false,
  beforeLoad: async () => {
    try {
      await logoutFn()
    } catch (err) {
      // logoutFn throws a redirect to /login on success.
      if (err instanceof Response || (err as any)?.status) throw err
    }
    throw redirect({ to: '/login' })
  },
})
