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
    'Save a contact as a new lead in the CRM. Use when the user wants to add, save, or record a person/prospect. Extract name, email, phone, company from the conversation. Resolve references like "this email" to actual values.',
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
    'Create a follow-up reminder. Use when the user wants to be reminded, follow up, or schedule something for later.',
  inputSchema: z.object({
    title: z.string().describe('Short title for the reminder'),
    description: z.string().optional().describe('Additional details'),
    due_at: z
      .string()
      .describe('When the reminder is due, ISO 8601 format (e.g. 2026-06-22T15:00:00Z)'),
  }),
  execute: async ({ title, description, due_at }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        owner_id: user.id,
        title,
        description: description || null,
        due_at,
        channel: 'in_app',
        status: 'pending',
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
 * All tools available to agents.
 */
export const agentTools = {
  createLead: createLeadTool,
  createReminder: createReminderTool,
}
