import { createServerFn } from '@tanstack/react-start'
import type {
  FinancialGoalRow,
  CreateGoalInput,
  UpdateGoalInput,
  GoalStatus,
  GoalCategory,
} from './financial-goals.server'

export type { FinancialGoalRow, CreateGoalInput, UpdateGoalInput, GoalStatus, GoalCategory }

export const getTimeframeLabel = (timeframe: string): string => {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  }
  return labels[timeframe] ?? timeframe
}

export const getGoals = createServerFn({ method: 'GET' }).handler(async () => {
  const { getGoalsImpl } = await import('./financial-goals.server')
  return getGoalsImpl()
})

export const createGoal = createServerFn({ method: 'POST' })
  .validator((d: CreateGoalInput) => d)
  .handler(async ({ data }) => {
    const { createGoalImpl } = await import('./financial-goals.server')
    return createGoalImpl(data)
  })

export const updateGoal = createServerFn({ method: 'POST' })
  .validator((d: UpdateGoalInput) => d)
  .handler(async ({ data }) => {
    const { updateGoalImpl } = await import('./financial-goals.server')
    return updateGoalImpl(data)
  })

export const deleteGoal = createServerFn({ method: 'POST' })
  .validator((d: { goalId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteGoalImpl } = await import('./financial-goals.server')
    return deleteGoalImpl(data.goalId)
  })
