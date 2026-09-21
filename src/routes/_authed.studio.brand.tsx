import { createFileRoute } from '@tanstack/react-router'
import { BrandStudio } from '@/components/studio/brand-studio'

export const Route = createFileRoute('/_authed/studio/brand')({
  component: BrandStudio,
})
