import { generateText } from 'ai'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { getDefaultModel } from '@/lib/ai-provider'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TimeFrame = 'day' | 'week' | 'month' | 'quarter'

export interface TaskRow {
  id: string
  owner_id: string
  agent_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  time_frame: TimeFrame
  planned_date: string | null
  due_date: string | null
  sort_order: number
  tags: string[]
  generated: boolean
  created_at: string
  updated_at: string
}

export interface GeneratePlanInput {
  prompt: string
  timeFrame: TimeFrame
  plannedDate?: string
}

// ---------------------------------------------------------------------------
// Tasks CRUD
// ---------------------------------------------------------------------------

export async function getTasksImpl(input: {
  timeFrame?: string
  plannedDate?: string
}): Promise<TaskRow[] | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', user.id)
      .order('sort_order', { ascending: true })

    if (input.timeFrame) {
      query = query.eq('time_frame', input.timeFrame)
    }
    if (input.plannedDate) {
      query = query.eq('planned_date', input.plannedDate)
    }

    const { data, error } = await query
    if (error) return { error: error.message }
    return data as unknown as TaskRow[]
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load tasks' }
  }
}

export async function createTaskImpl(input: {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  timeFrame?: TimeFrame
  plannedDate?: string
  dueDate?: string
  agentId?: string
  tags?: string[]
}): Promise<{ id: string } | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        owner_id: user.id,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? 'todo',
        priority: input.priority ?? 'medium',
        time_frame: input.timeFrame ?? 'day',
        planned_date: input.plannedDate ?? null,
        due_date: input.dueDate ?? null,
        agent_id: input.agentId ?? null,
        tags: input.tags ?? [],
      })
      .select('id')
      .single()

    if (error) return { error: error.message }
    return { id: data.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create task' }
  }
}

export async function updateTaskImpl(input: {
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
}): Promise<{ error: string } | null> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const updates: Record<string, string | number | string[] | null> = {}
    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.status !== undefined) updates.status = input.status
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.timeFrame !== undefined) updates.time_frame = input.timeFrame
    if (input.plannedDate !== undefined) updates.planned_date = input.plannedDate
    if (input.dueDate !== undefined) updates.due_date = input.dueDate
    if (input.agentId !== undefined) updates.agent_id = input.agentId
    if (input.tags !== undefined) updates.tags = input.tags
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', input.taskId)

    if (error) return { error: error.message }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update task' }
  }
}

export async function deleteTaskImpl(
  taskId: string,
): Promise<{ error: string } | null> {
  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
    if (error) return { error: error.message }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete task' }
  }
}

export async function reorderTasksImpl(
  updates: { taskId: string; status: TaskStatus; sortOrder: number }[],
): Promise<{ error: string } | null> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    for (const u of updates) {
      const { error } = await supabase
        .from('tasks')
        .update({ status: u.status, sort_order: u.sortOrder })
        .eq('id', u.taskId)
      if (error) return { error: error.message }
    }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reorder tasks' }
  }
}

// ---------------------------------------------------------------------------
// AI Plan Generation
// ---------------------------------------------------------------------------

export async function generatePlanImpl(input: {
  prompt: string
  timeFrame: TimeFrame
  plannedDate?: string
}): Promise<{ tasks: { title: string; description?: string; priority: TaskPriority }[] } | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const timeFrameLabels: Record<TimeFrame, string> = {
      day: 'day',
      week: 'week',
      month: 'month',
      quarter: 'quarter',
    }

    const result = await generateText({
      model: getDefaultModel(),
      system: `You are a strategic planning assistant. Break down the user's goal into actionable tasks for their ${timeFrameLabels[input.timeFrame]}-long plan.

Return ONLY a JSON array of task objects (no markdown, no explanation). Each object has:
- "title": short actionable task name (max 8 words)
- "description": optional brief detail (max 20 words)
- "priority": one of "low", "medium", "high", "urgent"

Rules:
- Generate 3-8 tasks appropriate for the time frame
- Tasks should be specific and actionable
- Order them logically (first things first)
- If the prompt is vague, make reasonable assumptions
- Return valid JSON only: [{ "title": "...", "description": "...", "priority": "medium" }]`,
      prompt: input.prompt,
      maxOutputTokens: 2000,
      temperature: 0.7,
    })

    const raw = result.text
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { error: 'AI response was not valid JSON. Try rephrasing your prompt.' }
    }

    const tasks: { title: string; description?: string; priority: TaskPriority }[] = JSON.parse(jsonMatch[0])

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return { error: 'AI returned an empty plan. Try a more detailed prompt.' }
    }

    // Save each generated task
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i]
      await supabase.from('tasks').insert({
        owner_id: user.id,
        title: t.title,
        description: t.description ?? null,
        status: 'todo',
        priority: t.priority || 'medium',
        time_frame: input.timeFrame,
        planned_date: input.plannedDate ?? null,
        sort_order: i,
        generated: true,
      })
    }

    return { tasks }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to generate plan' }
  }
}
