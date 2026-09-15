import { ArrowLeft, Clock3, Sparkles } from 'lucide-react'
import { createFileRoute, Link } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const StudioComingSoon = () => {
  const { user } = Route.useRouteContext()

  return (
    <DashboardShell
      userEmail={user?.email}
      userName={user?.email?.split('@')[0]}
    >
      <PageHeader
        eyebrow="Planned workspace"
        icon={Sparkles}
        title="Marketing Studio"
        description="A dedicated creative workspace is on the roadmap, but it is not part of the current product release."
      />

      <Card className="app-ink-card relative min-h-[430px] overflow-hidden">
        <div className="pointer-events-none absolute -right-28 -top-32 size-80 rounded-full bg-[#F1663C]/20 blur-[90px]" />
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-60" />
        <CardContent className="relative flex min-h-[380px] flex-col items-start justify-center py-10 sm:px-10 lg:px-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#F49A70]">
            <Clock3 className="size-3" /> Coming soon
          </span>
          <h2 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
            The creative canvas is staying under wraps for now.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">
            We’re focusing the current release on your agents, relationships,
            planning, and knowledge workflows. Studio will return when it is
            ready to meet the same quality bar.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-[10px] font-medium text-white/45">
            {['Campaign content', 'Visual generation', 'Storyboards', 'Asset library'].map((item) => (
              <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5">
                {item}
              </span>
            ))}
          </div>
          <Button asChild variant="outline" className="mt-9 border-white/10 bg-white/[0.05] text-white hover:bg-white/10 hover:text-white">
            <Link to="/dashboard"><ArrowLeft className="size-4" /> Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}

export const Route = createFileRoute('/_authed/studio')({
  component: StudioComingSoon,
})
