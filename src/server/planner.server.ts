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

// ---------------------------------------------------------------------------
// Calendar Events (ICS Import)
// ---------------------------------------------------------------------------

export interface CalendarEventRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  location: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  source: string
  source_uid: string | null
  imported_at: string
  created_at: string
  updated_at: string
}

function parseIcsDate(val: string): string {
  const cleaned = val.replace(/[^0-9TZ]/g, '')
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return val
}

interface ParsedIcsEvent {
  title: string
  description: string | null
  location: string | null
  start_date: string
  end_date: string | null
  all_day: boolean
  source_uid: string | null
}

export function parseIcsContent(icsContent: string): ParsedIcsEvent[] {
  const events: ParsedIcsEvent[] = []
  const lines = icsContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  const unfolded: string[] = []
  let carry = ''
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      carry += line.slice(1)
    } else {
      if (carry) unfolded.push(carry)
      carry = line
    }
  }
  if (carry) unfolded.push(carry)

  const veventBlocks: string[][] = []
  let current: string[] | null = null
  let inEvent = false
  for (const line of unfolded) {
    if (line === 'BEGIN:VEVENT') {
      current = []
      inEvent = true
    } else if (line === 'END:VEVENT') {
      if (current) veventBlocks.push(current)
      current = null
      inEvent = false
    } else if (inEvent && current) {
      current.push(line)
    }
  }

  for (const block of veventBlocks) {
    const event: Record<string, string> = {}
    for (const line of block) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).split(';')[0]
      const value = line.slice(colonIdx + 1)
      if (key.startsWith('DTSTART') || key.startsWith('DTEND') || key === 'SUMMARY' || key === 'DESCRIPTION' || key === 'LOCATION' || key === 'UID') {
        event[key] = value
      }
    }

    if (!event['SUMMARY']) continue

    const dtstart = event['DTSTART'] || ''
    const dtend = event['DTEND'] || ''
    const isAllDay = !dtstart.includes('T')

    const startDate = parseIcsDate(dtstart)
    let endDate: string | null = null
    if (dtend) {
      endDate = parseIcsDate(dtend)
      if (isAllDay && endDate) {
        const d = new Date(endDate)
        d.setDate(d.getDate() - 1)
        endDate = d.toISOString().slice(0, 10)
      }
    }

    events.push({
      title: event['SUMMARY'].replace(/\\n/g, '\n').replace(/\\,/g, ','),
      description: event['DESCRIPTION'] ? event['DESCRIPTION'].replace(/\\n/g, '\n').replace(/\\,/g, ',') : null,
      location: event['LOCATION'] ? event['LOCATION'].replace(/\\n/g, '\n').replace(/\\,/g, ',') : null,
      start_date: startDate,
      end_date: endDate,
      all_day: isAllDay,
      source_uid: event['UID'] || null,
    })
  }

  return events
}

export async function importCalendarEventsImpl(
  icsContent: string,
): Promise<{ count: number } | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const parsed = parseIcsContent(icsContent)
    if (parsed.length === 0) return { error: 'No events found in the ICS file' }

    const rows = parsed.map((ev) => ({
      owner_id: user.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      start_date: ev.start_date,
      end_date: ev.end_date,
      all_day: ev.all_day,
      source: 'ics',
      source_uid: ev.source_uid,
    }))

    const { error } = await supabase.from('calendar_events').insert(rows)
    if (error) return { error: error.message }

    return { count: parsed.length }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to import calendar events' }
  }
}

export async function getCalendarEventsImpl(): Promise<CalendarEventRow[] | { error: string }> {
  try {
    const supabase = getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('owner_id', user.id)
      .order('start_date', { ascending: true })

    if (error) return { error: error.message }
    return data as unknown as CalendarEventRow[]
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load calendar events' }
  }
}

export async function deleteCalendarEventImpl(
  id: string,
): Promise<{ error: string } | null> {
  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
    if (error) return { error: error.message }
    return null
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete calendar event' }
  }
}
