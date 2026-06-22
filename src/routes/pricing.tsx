import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Brand } from '@/components/brand'
import { PlanBadge } from '@/components/billing/plan-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  PLAN_CONFIGS,
  PLAN_ORDER,
  type PlanTier,
} from '@/lib/plans'
import { getProfile } from '@/server/settings'

export const Route = createFileRoute('/pricing')({
  beforeLoad: ({ context }) => {
    // Pricing is public, but if not logged in we still allow viewing.
    return { user: context.user }
  },
  component: PricingPage,
})

const ALL_FEATURES: { key: string; label: string }[] = [
  { key: 'agents', label: 'AI agents' },
  { key: 'crm', label: 'CRM pipeline' },
  { key: 'marketingStudio', label: 'Marketing Studio' },
  { key: 'ragDocuments', label: 'RAG knowledge base' },
  { key: 'scheduledPosts', label: 'Scheduled posts' },
  { key: 'aiImageGen', label: 'AI image generation' },
  { key: 'aiVideoGen', label: 'AI video generation' },
  { key: 'teamSeats', label: 'Team seats' },
  { key: 'apiAccess', label: 'API access' },
  { key: 'whiteLabel', label: 'White-label' },
  { key: 'prioritySupport', label: 'Priority support' },
]

function PricingPage() {
  const user = Route.useRouteContext().user
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
  const currentTier: PlanTier = profile?.plan ?? 'free'
  const currentIdx = PLAN_ORDER.indexOf(currentTier)
  const nextTier = currentIdx < PLAN_ORDER.length - 1 ? PLAN_ORDER[currentIdx + 1] : null

  return (
    <div className="min-h-svh bg-gradient-to-b from-muted/30 to-background">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/login" className="flex items-center gap-2">
          <Brand />
        </Link>
        {user ? (
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4" /> Back to dashboard
            </Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Start free, upgrade when you're ready. Every plan includes the
            agent framework, DeepSeek-powered chat, and Supabase storage.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((tier) => {
            const cfg = PLAN_CONFIGS[tier]
            const isCurrent = Boolean(user) && tier === currentTier
            const isNext = Boolean(user) && tier === nextTier && !isCurrent
            const showMostPopular = cfg.featured && !user

            return (
              <Card
                key={tier}
                className={cn(
                  'relative flex flex-col transition-shadow',
                  isCurrent && 'border-muted-foreground/20',
                  isNext && 'border-primary shadow-lg ring-1 ring-primary',
                  showMostPopular && 'border-primary shadow-lg ring-1 ring-primary',
                )}
              >
                {isNext && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      <Sparkles className="size-3" /> Recommended upgrade
                    </span>
                  </div>
                )}
                {showMostPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      <Sparkles className="size-3" /> Most popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2
                      className="font-semibold"
                      style={{ color: cfg.accent }}
                    >
                      {cfg.label}
                    </h2>
                    {isCurrent && <PlanBadge tier={tier} />}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {cfg.price === null
                        ? 'Custom'
                        : cfg.price === 0
                          ? '$0'
                          : `$${cfg.price}`}
                    </span>
                    {cfg.price !== null && cfg.price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {' '}
                        /mo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cfg.tagline}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-2 text-sm">
                    <LimitRow
                      label="AI agents"
                      value={cfg.limits.agents.max}
                    />
                    <LimitRow
                      label="Messages"
                      value={cfg.limits.messages.max}
                    />
                    <LimitRow
                      label="Posts"
                      value={cfg.limits.posts.max}
                    />
                    <LimitRow
                      label="Documents"
                      value={cfg.limits.documents.max}
                    />
                    {ALL_FEATURES.filter((f) =>
                      cfg.features[f.key as keyof typeof cfg.features],
                    ).map((f) => (
                      <li
                        key={f.key}
                        className="flex items-center gap-2"
                      >
                        <Check className="size-4 text-primary" />
                        {f.label}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={
                      isNext || showMostPopular ? 'default' : 'outline'
                    }
                    className="w-full"
                    disabled={isCurrent}
                    asChild={isCurrent}
                  >
                    {isCurrent ? (
                      <span className="text-muted-foreground">Current plan</span>
                    ) : (
                      <Link to={user ? '/dashboard' : '/login'}>
                        {isNext ? `Upgrade to ${cfg.label}` : cfg.cta}
                      </Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          All plans include unlimited conversations on paid tiers. Prices in
          USD. Cancel anytime.
        </p>
      </main>
    </div>
  )
}

function LimitRow({
  label,
  value,
}: {
  label: string
  value: number | null
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value === null ? 'Unlimited' : value}</span>
    </li>
  )
}
