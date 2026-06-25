import { Target, Plus, TrendingUp } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useFinancialGoals } from '@/hooks/use-financial-goals'
import { getTimeframeLabel } from '@/server/financial-goals'
import { motion } from '@/lib/animations'

export function GoalsDashboardCard() {
  const { data: goals, isLoading } = useFinancialGoals()

  const activeGoals =
    goals && !('error' in goals) ? goals.filter((g) => g.status === 'active') : []

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activeGoals.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Target className="size-5 text-primary" />
          </div>
          <p className="text-sm font-medium">No financial goals yet</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Set targets and track your progress over time.
          </p>
          <Button size="sm" asChild>
            <Link to="/goals">
              <Plus className="size-3.5" /> Set a goal
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const sorted = [...activeGoals].sort((a, b) => {
    const aPct = a.current_amount / a.target_amount
    const bPct = b.current_amount / b.target_amount
    return aPct - bPct
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              Financial Goals
            </CardTitle>
            <CardDescription>
              {activeGoals.length} active goal{activeGoals.length === 1 ? '' : 's'}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/goals">
              View all <TrendingUp className="ml-1 size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="space-y-3">
            {sorted.slice(0, 4).map((goal) => {
              const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{goal.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                    </span>
                    <span>{getTimeframeLabel(goal.timeframe)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
