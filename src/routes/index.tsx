import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/landing-page'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingPage,
})
