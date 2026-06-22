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
    'Create a follow-up reminder. Use when the user wants to be reminded, follow up, or schedule something for later. If the reminder is about a specific person/lead, include their name in lead_name so it gets linked to their CRM record.',
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
 * All tools available to agents.
 */
export const agentTools = {
  createLead: createLeadTool,
  createReminder: createReminderTool,
  sendWhatsApp: sendWhatsAppTool,
  sendTelegram: sendTelegramTool,
}
