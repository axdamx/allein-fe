import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  generatePlan,
  reorderTasks,
} from '@/server/planner'
import type { TaskRow, TaskStatus, TaskPriority, TimeFrame } from '@/server/planner'

export function useTasks(timeFrame?: string, plannedDate?: string) {
  return useQuery({
    queryKey: ['tasks', timeFrame, plannedDate],
    queryFn: () => getTasks({ data: { timeFrame, plannedDate } }),
    staleTime: 10 * 1000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      status?: TaskStatus
      priority?: TaskPriority
      timeFrame?: TimeFrame
      plannedDate?: string
      dueDate?: string
      agentId?: string
      tags?: string[]
    }) => createTask({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Task created')
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      taskId: string
      title?: string
      description?: string
      status?: TaskStatus
      priority?: TaskPriority
      timeFrame?: TimeFrame
      plannedDate?: string
      dueDate?: string
      agentId?: string
      tags?: string[]
      sortOrder?: number
    }) => updateTask({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => deleteTask({ data: { taskId } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Task deleted')
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useGeneratePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      prompt: string
      timeFrame: TimeFrame
      plannedDate?: string
    }) => generatePlan({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Plan generated with ${result.tasks.length} tasks`)
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to generate plan'
      toast.error(msg)
    },
  })
}

export function useReorderTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: { taskId: string; status: TaskStatus; sortOrder: number }[]) =>
      reorderTasks({ data: updates }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export type { TaskRow, TaskStatus, TaskPriority, TimeFrame }
