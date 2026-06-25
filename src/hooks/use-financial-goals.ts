import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  type FinancialGoalRow,
  type CreateGoalInput,
  type UpdateGoalInput,
} from '@/server/financial-goals'

export function useFinancialGoals() {
  return useQuery({
    queryKey: ['financial-goals'],
    queryFn: () => getGoals(),
    staleTime: 10 * 1000,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGoalInput) => createGoal({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Financial goal created')
      qc.invalidateQueries({ queryKey: ['financial-goals'] })
    },
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateGoalInput) => updateGoal({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['financial-goals'] })
    },
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (goalId: string) => deleteGoal({ data: { goalId } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Goal deleted')
      qc.invalidateQueries({ queryKey: ['financial-goals'] })
    },
  })
}

export type { FinancialGoalRow, CreateGoalInput, UpdateGoalInput }
