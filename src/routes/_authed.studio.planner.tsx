import { createFileRoute } from '@tanstack/react-router'
import { ContentPlanner } from '@/components/studio/content-planner'

export const Route = createFileRoute('/_authed/studio/planner')({
  component: ContentPlanner,
})
