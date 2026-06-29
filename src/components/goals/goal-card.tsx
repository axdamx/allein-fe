import { CheckCircle2, Circle, EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { motion, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { getTimeframeLabel } from '@/server/financial-goals'
import { CATEGORY_CONFIG } from './goals-utils'
import type { FinancialGoalRow } from '@/server/financial-goals.server'

interface GoalCardProps {
  goal: FinancialGoalRow
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
}

export const GoalCard = ({ goal, onEdit, onDelete, onComplete }: GoalCardProps) => {
  const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
  const cat = CATEGORY_CONFIG[goal.category] ?? CATEGORY_CONFIG.custom
  const isCompleted = goal.status === 'completed'

  return (
    <motion.div variants={staggerItem}>
      <Card className={cn(isCompleted && 'opacity-70')}>
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="size-5 text-muted-foreground/30 shrink-0" />
                )}
                <h3 className={cn('text-base font-semibold', isCompleted && 'line-through')}>
                  {goal.title}
                </h3>
              </div>
              {goal.description && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1 ml-7">
                  {goal.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                  cat.color,
                )}
              >
                {cat.label}
              </span>
              {!isCompleted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" className="shrink-0">
                      <EllipsisVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="size-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onComplete}>
                      <CheckCircle2 className="size-3.5" /> Mark done
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={onDelete}>
                      <Trash2 className="size-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="ml-7 mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium tabular-nums">
                ${goal.current_amount.toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                ${goal.target_amount.toLocaleString()}
              </span>
            </div>
            <Progress value={pct} className={cn('h-2', isCompleted && 'opacity-50')} />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium tabular-nums">{pct}% complete</span>
              <div className="flex items-center gap-3">
                <span>{getTimeframeLabel(goal.timeframe)}</span>
                {goal.deadline && (
                  <span>Due {format(new Date(goal.deadline), 'MMM d, yyyy')}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
