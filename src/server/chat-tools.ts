/**
 * Agent tools — native function calling via Vercel AI SDK v6.
 *
 * The LLM calls these functions directly with guaranteed-type parameters.
 * It decides WHEN to call a tool and fills params from conversation context.
 *
 * Note: AI SDK v6 uses `inputSchema` (not `parameters`) and `tool()` from 'ai'.
 */
import { tool } from 'ai'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

/**
 * Tool: Create a lead in the CRM.
 */
export const createLeadTool = tool({
  description:
    'Save a contact as a new lead in the CRM. Use when the user wants to add, save, or record a person/prospect. PROACTIVELY extract name, email, phone, company from the conversation context — do NOT ask the user for details they already provided. Resolve references like "this email", "that person", "this client" to actual values.',
  inputSchema: z.object({
    name: z
      .string()
      .describe('Full name of the contact. Derive from email if not given.'),
    email: z.string().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
    company: z.string().optional().describe('Company name'),
    notes: z.string().optional().describe('Additional notes'),
  }),
  execute: async ({ name, email, phone, company, notes }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    // Enforce plan limit
    const { enforceLimitImpl } = await import('@/server/profile.server')
    try {
      await enforceLimitImpl('leads')
    } catch {
      return { success: false, error: 'Lead limit reached on your current plan.' }
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        owner_id: user.id,
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: 'website',
        status: 'new',
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      leadId: data.id,
      message: `Lead "${name}" created successfully`,
    }
  },
})

/**
 * Tool: Create a follow-up reminder.
 */
export const createReminderTool = tool({
  description:
    'Create a follow-up reminder. Use when the user wants to be reminded, follow up, or schedule something for later. Extract the title, description, due date, and person from the conversation context — do not ask the user for details they already mentioned. If the reminder is about a specific person/lead, include their name in lead_name so it gets linked to their CRM record.',
  inputSchema: z.object({
    title: z.string().describe('Short title for the reminder'),
    description: z.string().optional().describe('Additional details'),
    due_at: z
      .string()
      .describe('When the reminder is due, ISO 8601 format (e.g. 2026-06-22T15:00:00Z)'),
    lead_id: z.string().optional().describe('Lead ID to link this reminder to (if known)'),
    lead_name: z.string().optional().describe('Name of the lead this reminder is about — used to look up the lead record if lead_id is not provided'),
  }),
  execute: async ({ title, description, due_at, lead_id, lead_name }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    let resolvedLeadId = lead_id

    if (!resolvedLeadId && lead_name) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('owner_id', user.id)
        .ilike('name', lead_name)
        .maybeSingle()
      if (lead) resolvedLeadId = lead.id
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        owner_id: user.id,
        title,
        description: description || null,
        due_at,
        channel: 'in_app',
        status: 'pending',
        lead_id: resolvedLeadId ?? null,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      reminderId: data.id,
      message: `Reminder "${title}" set for ${due_at}`,
    }
  },
})

/**
 * Tool: Send a WhatsApp message to a contact.
 */
export const sendWhatsAppTool = tool({
  description:
    'Send a WhatsApp message to a contact. Use when the user wants to message a lead, customer, or prospect on WhatsApp. Requires their phone number with country code.',
  inputSchema: z.object({
    to: z
      .string()
      .describe('Recipient phone number with country code (e.g. 60123456789)'),
    message: z.string().describe('Message body to send'),
    leadId: z.string().optional().describe('Lead ID to log this message against'),
  }),
  execute: async ({ to, message, leadId }) => {
    const { sendWhatsApp } = await import('@/server/messaging')
    const result = await sendWhatsApp(to, message)
    if (!result.success) return result

    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && leadId) {
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('owner_id', user.id)
    }

    return {
      success: true,
      message: `WhatsApp message sent to ${to}`,
      messageId: result.messageId,
    }
  },
})

/**
 * Tool: Send a Telegram message to a contact.
 */
export const sendTelegramTool = tool({
  description:
    'Send a Telegram message to a contact. Use when the user wants to message a lead, customer, or prospect on Telegram, or send info to their own Telegram. The user\'s Telegram chat ID is available in the User Context — use that when the user says "send to my Telegram".',
  inputSchema: z.object({
    chatId: z
      .string()
      .describe('Telegram chat ID of the recipient (numeric string). For sending to the user themselves, use the Telegram chat ID from User Context.'),
    message: z.string().describe('Message body to send'),
  }),
  execute: async ({ chatId, message }) => {
    const { sendTelegram } = await import('@/server/messaging')
    const result = await sendTelegram(chatId, message)
    if (!result.success) return result

    return {
      success: true,
      message: `Telegram message sent to chat ${chatId}`,
      messageId: result.messageId,
    }
  },
})

/**
 * Tool: Read/search clients from the CRM.
 */
export const readClientsTool = tool({
  description:
    'Read or search your clients from the CRM. Use when the user asks about their clients, customers, or contacts — including questions like "who has birthdays this month", "find client by name", "list my active clients", etc.',
  inputSchema: z.object({
    search: z.string().optional().describe('Search term to filter clients by name, email, or company'),
    birthdayMonth: z.number().min(1).max(12).optional().describe('Filter clients whose birthday falls in this month (1-12, e.g. 6 for June)'),
    status: z.enum(['active', 'inactive', 'churned']).optional().describe('Filter by client status'),
    limit: z.number().min(1).max(50).optional().default(20).describe('Maximum number of clients to return'),
  }),
  execute: async ({ search, birthdayMonth, status, limit }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated', clients: [] }

    let query = supabase
      .from('clients')
      .select('id, name, email, phone, company, status, date_of_birth, created_at')
      .eq('owner_id', user.id)
      .order('name', { ascending: true })

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`,
      )
    }

    if (status) {
      query = query.eq('status', status)
    }

    let data, error

    if (birthdayMonth) {
      ;({ data, error } = await supabase.rpc('clients_by_birthday_month', {
        p_owner_id: user.id,
        p_month: birthdayMonth,
      }))
    } else {
      query = query.limit(limit ?? 20)
      ;({ data, error } = await query)
    }

    if (error) return { success: false, error: error.message, clients: [] }

    const clients = (data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      status: c.status,
      birthday: c.date_of_birth,
    }))

    return {
      success: true,
      clients,
    }
  },
})

/**
 * Tool: Create a planner task.
 */
export const createTaskTool = tool({
  description:
    'Create a task in the planner. Use when the user wants to schedule, plan, add a to-do, or create a task. Extract the title, description, priority, dates from the conversation context — do not ask the user for details they already mentioned. Tasks can have a timeframe (day/week/month/quarter), priority, due date, and planned date.',
  inputSchema: z.object({
    title: z.string().describe('Short title for the task'),
    description: z.string().optional().describe('Detailed description of the task'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium').describe('Priority level'),
    timeFrame: z.enum(['day', 'week', 'month', 'quarter']).optional().default('day').describe('Timeframe for the task'),
    plannedDate: z.string().optional().describe('Planned date in YYYY-MM-DD format'),
    dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    tags: z.array(z.string()).optional().describe('Tags to categorize the task'),
  }),
  execute: async ({ title, description, priority, timeFrame, plannedDate, dueDate, tags }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { createTaskImpl } = await import('@/server/planner.server')
    const result = await createTaskImpl({
      title,
      description,
      status: 'todo',
      priority,
      timeFrame,
      plannedDate,
      dueDate,
      tags,
    })

    if ('error' in result) return { success: false, error: result.error }
    return { success: true, taskId: result.id, message: `Task "${title}" created` }
  },
})

/**
 * Tool: Read/search planner tasks.
 */
export const readTasksTool = tool({
  description:
    'Read or search tasks from the planner. Use when the user asks about their tasks, schedule, to-dos, or planner. Supports filtering by timeframe and planned date.',
  inputSchema: z.object({
    timeFrame: z.enum(['day', 'week', 'month', 'quarter']).optional().describe('Filter by timeframe'),
    plannedDate: z.string().optional().describe('Filter by planned date in YYYY-MM-DD format'),
    limit: z.number().min(1).max(50).optional().default(20).describe('Maximum number of tasks to return'),
  }),
  execute: async ({ timeFrame, plannedDate, limit }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated', tasks: [] }

    let query = supabase
      .from('tasks')
      .select('id, title, description, status, priority, time_frame, planned_date, due_date, tags, created_at')
      .eq('owner_id', user.id)
      .order('sort_order', { ascending: true })

    if (timeFrame) query = query.eq('time_frame', timeFrame)
    if (plannedDate) query = query.eq('planned_date', plannedDate)

    query = query.limit(limit ?? 20)

    const { data, error } = await query
    if (error) return { success: false, error: error.message, tasks: [] }

    return {
      success: true,
      tasks: data.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        timeFrame: t.time_frame,
        plannedDate: t.planned_date,
        dueDate: t.due_date,
        tags: t.tags,
      })),
    }
  },
})

/**
 * All tools available to agents.
 */
export const agentTools = {
  createLead: createLeadTool,
  createReminder: createReminderTool,
  sendWhatsApp: sendWhatsAppTool,
  sendTelegram: sendTelegramTool,
  readClients: readClientsTool,
  createTask: createTaskTool,
  readTasks: readTasksTool,
}
