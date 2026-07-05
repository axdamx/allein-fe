import { Link } from '@tanstack/react-router'
import {
  Brain,
  Calendar,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const ACTIONS = [
  {
    icon: MessageSquare,
    label: 'Open Chat',
    description: 'Talk to your AI agent',
    to: '/chat' as const,
  },
  {
    icon: Calendar,
    label: 'Plan your week',
    description: 'Generate tasks with AI',
    to: '/planner' as const,
  },
  {
    icon: Sparkles,
    label: 'Create content',
    description: 'Images & video in Studio',
    to: '/studio' as const,
  },
  {
    icon: Brain,
    label: 'Add knowledge',
    description: 'Upload docs for your agent',
    to: '/knowledge-base' as const,
  },
]

/**
 * Dashboard "Quick actions" card — surfaces the primary modules that the
 * dashboard's other cards don't already link to (Chat, Planner, Studio, KB).
 * Replaces the previous passive "Overview" stats card with active navigation.
 */
export const QuickActions = () => {
  return (
    <Card data-tour="dashboard-quickactions">
      <CardHeader>
        <CardTitle className="text-base">Quick actions</CardTitle>
        <CardDescription>Jump to any module</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="group flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-border hover:bg-muted/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <action.icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{action.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
