import { createFileRoute, redirect } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/landing-page'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Allein — Your AI workspace for modern agent work' },
      {
        name: 'description',
        content:
          'Manage leads, follow-ups, documents, and marketing from one AI workspace built for Malaysian agents.',
      },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingPage,
})
