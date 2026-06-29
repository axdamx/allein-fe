import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSupabaseServerClient } from '../server.server.mjs';
import '@tanstack/react-start/server';
import '@supabase/ssr';
import 'ws';

const createLeadTool = createTool({
  id: "create-lead",
  description: "Save a contact as a new lead in the CRM. Use when the user wants to add, save, or record a person/prospect. PROACTIVELY extract name, email, phone, company from the conversation context \u2014 do NOT ask the user for details they already provided.",
  inputSchema: z.object({
    name: z.string().describe("Full name of the contact. Derive from email if not given."),
    email: z.string().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    company: z.string().optional().describe("Company name"),
    notes: z.string().optional().describe("Additional notes")
  }),
  execute: async ({ name, email, phone, company, notes }) => {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    const { enforceLimitImpl } = await import('../profile.server.mjs');
    try {
      await enforceLimitImpl("leads");
    } catch {
      return { success: false, error: "Lead limit reached on your current plan." };
    }
    const { data, error } = await supabase.from("leads").insert({
      owner_id: user.id,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      source: "website",
      status: "new",
      notes: notes || null
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      leadId: data.id,
      message: `Lead "${name}" created successfully`
    };
  }
});
const createReminderTool = createTool({
  id: "create-reminder",
  description: "Create a follow-up reminder. Use when the user wants to be reminded, follow up, or schedule something for later. Extract the title, description, due date, and person from the conversation context \u2014 do not ask the user for details they already mentioned.",
  inputSchema: z.object({
    title: z.string().describe("Short title for the reminder"),
    description: z.string().optional().describe("Additional details"),
    due_at: z.string().describe("When the reminder is due, ISO 8601 format (e.g. 2026-06-22T15:00:00Z)"),
    lead_id: z.string().optional().describe("Lead ID to link this reminder to (if known)"),
    lead_name: z.string().optional().describe("Name of the lead this reminder is about")
  }),
  execute: async ({ title, description, due_at, lead_id, lead_name }) => {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    let resolvedLeadId = lead_id;
    if (!resolvedLeadId && lead_name) {
      const { data: lead } = await supabase.from("leads").select("id").eq("owner_id", user.id).ilike("name", lead_name).maybeSingle();
      if (lead) resolvedLeadId = lead.id;
    }
    const { data, error } = await supabase.from("reminders").insert({
      owner_id: user.id,
      title,
      description: description || null,
      due_at,
      channel: "in_app",
      status: "pending",
      lead_id: resolvedLeadId ?? null
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      reminderId: data.id,
      message: `Reminder "${title}" set for ${due_at}`
    };
  }
});

export { createLeadTool, createReminderTool };
