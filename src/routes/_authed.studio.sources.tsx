import { createFileRoute } from '@tanstack/react-router'
import { SourceStudio } from '@/components/studio/source-studio'

export const Route = createFileRoute('/_authed/studio/sources')({ component: SourceStudio })
