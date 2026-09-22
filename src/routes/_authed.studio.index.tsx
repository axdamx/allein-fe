import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/studio/')({
  beforeLoad: () => {
    throw redirect({ to: '/studio/planner' })
  },
})
