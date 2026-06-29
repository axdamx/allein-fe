import { useState } from 'react'
import {
  Target,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { GoalCard } from '@/components/goals/goal-card'
import { GoalModal } from '@/components/goals/goals-modal'
import { useFinancialGoals, useUpdateGoal, useDeleteGoal } from '@/hooks/use-financial-goals'
import { motion, staggerContainer } from '@/lib/animations'
import type { FinancialGoalRow } from '@/server/financial-goals.server'

export const Route = createFileRoute('/_authed/goals')({
  component: GoalsPage,
})

type GoalsTab = 'active' | 'completed'

function GoalsPage() {
  const { user } = Route.useRouteContext()
  const { data: goals, isLoading } = useFinancialGoals()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const [tab, setTab] = useState<GoalsTab>('active')
  const [modalOpen, setModalOpen] = useState(false)
  const [editGoal, setEditGoal] = useState<FinancialGoalRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const goalList = goals && !('error' in goals) ? goals : []
  const activeGoals = goalList.filter((g) => g.status === 'active')
  const completedGoals = goalList.filter((g) => g.status === 'completed')
  const displayGoals = tab === 'active' ? activeGoals : completedGoals

  const totalTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalCurrent = activeGoals.reduce((sum, g) => sum + g.current_amount, 0)
  const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  const handleEdit = (goal: FinancialGoalRow) => {
    setEditGoal(goal)
    setModalOpen(true)
  }

  const handleDelete = (goalId: string) => {
    deleteGoal.mutate(goalId, { onSuccess: () => setDeleteConfirm(null) })
  }

  const handleComplete = (goal: FinancialGoalRow) => {
    updateGoal.mutate({ goalId: goal.id, status: 'completed', currentAmount: goal.target_amount })
  }

  if (isLoading) {
    return (
      <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Financial Goals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Set, track, and achieve your financial targets.
          </p>
        </div>
        <Button onClick={() => { setEditGoal(null); setModalOpen(true) }}>
          <Plus className="size-4" /> New Goal
        </Button>
      </div>

      {activeGoals.length > 0 && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Target className="size-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{overallPct}%</p>
                  <p className="text-xs text-muted-foreground">Overall progress</p>
                </div>
              </div>
              <Separator orientation="vertical" className="hidden h-10 md:block" />
              <div>
                <p className="text-lg font-semibold tabular-nums">
                  ${totalCurrent.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  of ${totalTarget.toLocaleString()} target
                </p>
              </div>
              <Separator orientation="vertical" className="hidden h-10 md:block" />
              <div>
                <p className="text-lg font-semibold tabular-nums">{activeGoals.length}</p>
                <p className="text-xs text-muted-foreground">Active goals</p>
              </div>
              <Separator orientation="vertical" className="hidden h-10 md:block" />
              <div>
                <p className="text-lg font-semibold tabular-nums">{completedGoals.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="ml-auto w-full max-w-xs">
                <Progress value={overallPct} className="h-2.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeGoals.length === 0 && completedGoals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <Target className="size-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No goals set yet</h2>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Define your first financial goal to start tracking progress and stay motivated.
            </p>
            <Button onClick={() => { setEditGoal(null); setModalOpen(true) }}>
              <Plus className="size-4" /> Set your first goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as GoalsTab)} className="mb-4">
            <TabsList>
              <TabsTrigger value="active">
                Active
                {activeGoals.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    {activeGoals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                {completedGoals.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px]">
                    {completedGoals.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {displayGoals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  <AlertCircle className="mx-auto mb-2 size-5" />
                  {tab === 'active' ? 'No active goals' : 'No completed goals yet'}
                </CardContent>
              </Card>
            ) : (
              displayGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => handleEdit(goal)}
                  onDelete={() => setDeleteConfirm(goal.id)}
                  onComplete={() => handleComplete(goal)}
                />
              ))
            )}
          </motion.div>
        </>
      )}

      <GoalModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditGoal(null) }}
        editGoal={editGoal}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete goal?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The goal and its progress will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteGoal.isPending}
            >
              {deleteGoal.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}


