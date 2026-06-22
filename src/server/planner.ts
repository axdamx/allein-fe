import { createServerFn } from '@tanstack/react-start'
import type { TaskPriority, TaskStatus, TimeFrame } from '@/server/planner.server'

export type { TaskPriority, TaskStatus, TimeFrame }
export type { TaskRow, GeneratePlanInput } from '@/server/planner.server'

export const getTasks = createServerFn({ method: 'GET' })
  .validator((d: { timeFrame?: string; plannedDate?: string }) => d)
  .handler(async ({ data }) => {
    const { getTasksImpl } = await import('./planner.server')
    return getTasksImpl(data)
  })

export const createTask = createServerFn({ method: 'POST' })
  .validator((d: {
    title: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    timeFrame?: TimeFrame
    plannedDate?: string
    dueDate?: string
    agentId?: string
    tags?: string[]
  }) => d)
  .handler(async ({ data }) => {
    const { createTaskImpl } = await import('./planner.server')
    return createTaskImpl(data)
  })

export const updateTask = createServerFn({ method: 'POST' })
  .validator((d: {
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
  }) => d)
  .handler(async ({ data }) => {
    const { updateTaskImpl } = await import('./planner.server')
    return updateTaskImpl(data)
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .validator((d: { taskId: string }) => d)
  .handler(async ({ data }) => {
    const { deleteTaskImpl } = await import('./planner.server')
    return deleteTaskImpl(data.taskId)
  })

export const generatePlan = createServerFn({ method: 'POST' })
  .validator((d: {
    prompt: string
    timeFrame: TimeFrame
    plannedDate?: string
  }) => d)
  .handler(async ({ data }) => {
    const { generatePlanImpl } = await import('./planner.server')
    return generatePlanImpl(data)
  })

export const reorderTasks = createServerFn({ method: 'POST' })
  .validator((d: { taskId: string; status: TaskStatus; sortOrder: number }[]) => d)
  .handler(async ({ data }) => {
    const { reorderTasksImpl } = await import('./planner.server')
    return reorderTasksImpl(data)
  })
