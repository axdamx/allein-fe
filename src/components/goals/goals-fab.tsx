import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Target, Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useFinancialGoals } from '@/hooks/use-financial-goals'
import { getTimeframeLabel } from '@/server/financial-goals'
import { GoalModal } from './goals-modal'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from '@/lib/animations'

export const GoalsFab = () => {
  const { data: goals, isLoading } = useFinancialGoals()
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)

  const activeGoals = goals && !('error' in goals) ? goals.filter((g) => g.status === 'active') : []
  const completedCount = goals && !('error' in goals) ? goals.filter((g) => g.status === 'completed').length : 0
  const hasGoals = activeGoals.length > 0

  const overallProgress = hasGoals
    ? Math.round(
        activeGoals.reduce((sum, g) => sum + (g.current_amount / g.target_amount) * 100, 0) /
          activeGoals.length,
      )
    : 0

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="lg"
                className={cn(
                  'relative h-14 w-14 rounded-full shadow-xl transition-shadow hover:shadow-2xl',
                  hasGoals ? 'bg-primary' : 'bg-primary',
                )}
              >
                {hasGoals ? (
                  <div className="relative flex items-center justify-center">
                    <Target className="size-5" />
                    <svg className="absolute inset-0 size-14 -rotate-90">
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - overallProgress / 100)}`}
                        className="text-primary-foreground/30"
                        opacity="0.4"
                      />
                      <circle
                        cx="28"
                        cy="28"
                        r="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - overallProgress / 100)}`}
                        className="text-primary-foreground"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <Plus className="size-6" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-80 p-0">
              {isLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              ) : hasGoals ? (
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-primary" />
                      <span className="text-sm font-semibold">Financial Goals</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {completedCount > 0 && `${completedCount} done · `}
                      {activeGoals.length} active
                    </span>
                  </div>
                  <div className="space-y-3">
                    {activeGoals.slice(0, 3).map((goal) => {
                      const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
                      return (
                        <div key={goal.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium truncate">{goal.title}</span>
                            <span className="text-muted-foreground tabular-nums">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>
                              ${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()}
                            </span>
                            <span>{getTimeframeLabel(goal.timeframe)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {activeGoals.length > 3 && (
                    <p className="mt-2 text-center text-[10px] text-muted-foreground">
                      +{activeGoals.length - 3} more goals
                    </p>
                  )}
                  <Separator className="my-3" />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => navigate({ to: '/goals' })}
                    >
                      <TrendingUp className="size-3.5" />
                      View all
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setModalOpen(true)}
                    >
                      <Plus className="size-3.5" />
                      Add goal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Target className="size-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">No financial goals yet</p>
                  <p className="mb-3 text-xs text-muted-foreground">
                    Set your first goal to start tracking progress.
                  </p>
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    <Plus className="size-3.5" />
                    Set a goal
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </motion.div>
      </AnimatePresence>

      <GoalModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
