import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateGoal, useUpdateGoal, type FinancialGoalRow } from '@/hooks/use-financial-goals'
import type { GoalCategory } from '@/server/financial-goals.server'

const CATEGORIES: { value: GoalCategory; label: string }[] = [
  { value: 'savings', label: 'Savings' },
  { value: 'investment', label: 'Investment' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'custom', label: 'Custom' },
]

const TIMEFRAMES = [
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' },
  { value: '2y', label: '2 years' },
  { value: '5y', label: '5 years' },
]

interface GoalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editGoal?: FinancialGoalRow | null
}

export const GoalModal = ({ open, onOpenChange, editGoal }: GoalModalProps) => {
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const isEditing = !!editGoal

  const [title, setTitle] = useState(editGoal?.title ?? '')
  const [description, setDescription] = useState(editGoal?.description ?? '')
  const [category, setCategory] = useState<GoalCategory>(editGoal?.category ?? 'savings')
  const [targetAmount, setTargetAmount] = useState(editGoal ? String(editGoal.target_amount) : '')
  const [currentAmount, setCurrentAmount] = useState(editGoal ? String(editGoal.current_amount) : '')
  const [timeframe, setTimeframe] = useState(editGoal?.timeframe ?? '1y')

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTitle(editGoal?.title ?? '')
      setDescription(editGoal?.description ?? '')
      setCategory(editGoal?.category ?? 'savings')
      setTargetAmount(editGoal ? String(editGoal.target_amount) : '')
      setCurrentAmount(editGoal ? String(editGoal.current_amount) : '')
      setTimeframe(editGoal?.timeframe ?? '1y')
    }
    onOpenChange(open)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !targetAmount) return

    const target = parseFloat(targetAmount)
    if (isNaN(target) || target <= 0) return

    const current = parseFloat(currentAmount) || 0

    if (isEditing && editGoal) {
      updateGoal.mutate(
        {
          goalId: editGoal.id,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          targetAmount: target,
          currentAmount: current,
          timeframe,
        },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createGoal.mutate(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          targetAmount: target,
          currentAmount: current,
          timeframe,
        },
        { onSuccess: () => onOpenChange(false) },
      )
    }
  }

  const isPending = createGoal.isPending || updateGoal.isPending
  const isValid = title.trim() && targetAmount && parseFloat(targetAmount) > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Goal' : 'Set a Financial Goal'}</DialogTitle>
            <DialogDescription>
              Define a financial target to track your progress over time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="title">Goal title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Save for a house down payment"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this goal..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map((tf) => (
                      <SelectItem key={tf.value} value={tf.value}>
                        {tf.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="target">Target amount ($)</Label>
                <Input
                  id="target"
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="current">Current amount ($)</Label>
                <Input
                  id="current"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Create goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
