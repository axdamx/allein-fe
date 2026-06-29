import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSupabaseServiceClient } from '../service.server.mjs';
import '@supabase/ssr';
import 'ws';

const readClientsTool = createTool({
  id: "read-clients",
  description: 'Read or search your clients from the CRM. Use when the user asks about their clients, customers, or contacts \u2014 including questions like "who has birthdays this month", "find client by name", "list my active clients", etc.',
  inputSchema: z.object({
    search: z.string().optional().describe("Search term to filter clients by name, email, or company"),
    birthdayMonth: z.number().min(1).max(12).optional().describe("Filter clients whose birthday falls in this month (1-12)"),
    status: z.enum(["active", "inactive", "churned"]).optional().describe("Filter by client status"),
    limit: z.number().min(1).max(50).optional().default(20).describe("Maximum number of clients to return")
  }),
  execute: async ({ search, birthdayMonth, status, limit }, context) => {
    const resourceId = context?.agent?.resourceId;
    const supabase = getSupabaseServiceClient();
    let query = supabase.from("clients").select("id, name, email, phone, company, status, date_of_birth, created_at").eq("owner_id", resourceId).order("name", { ascending: true });
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`
      );
    }
    if (status) query = query.eq("status", status);
    if (birthdayMonth) {
      query = query.not("date_of_birth", "is", null).eq("birth_month", birthdayMonth);
    }
    query = query.limit(limit ?? 20);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message, clients: [] };
    return {
      success: true,
      clients: data.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        status: c.status,
        birthday: c.date_of_birth
      }))
    };
  }
});
const createClientTool = createTool({
  id: "create-client",
  description: "Add a new client/customer to your CRM. Use when the user wants to save, add, or record a client. Extract name, email, phone, company, industry, notes from the conversation context \u2014 do NOT ask for details already provided.",
  inputSchema: z.object({
    name: z.string().describe("Full name of the client"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number with country code"),
    company: z.string().optional().describe("Company name"),
    industry: z.string().optional().describe("Industry"),
    notes: z.string().optional().describe("Additional notes"),
    date_of_birth: z.string().optional().describe("Date of birth in YYYY-MM-DD format"),
    tags: z.array(z.string()).optional().describe("Tags to categorize the client")
  }),
  execute: async (input, context) => {
    const resourceId = context?.agent?.resourceId;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("clients").insert({
      owner_id: resourceId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
      industry: input.industry ?? null,
      status: "active",
      notes: input.notes ?? null,
      tags: input.tags ?? [],
      date_of_birth: input.date_of_birth ?? null
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    return { success: true, clientId: data.id, message: `Client "${input.name}" created successfully` };
  }
});
const updateClientTool = createTool({
  id: "update-client",
  description: "Update a client's details \u2014 status, name, email, phone, company, industry, notes, tags, etc. Use when the user wants to change, modify, update, mark inactive/churned, or edit a client. If you don't know the clientId, call readClients first with the client's name to get their ID.",
  inputSchema: z.object({
    clientId: z.string().describe("The UUID of the client to update. Get this from readClients first if unknown."),
    name: z.string().optional().describe("New full name"),
    email: z.string().optional().describe("New email address"),
    phone: z.string().optional().describe("New phone number"),
    company: z.string().optional().describe("New company name"),
    industry: z.string().optional().describe("New industry"),
    status: z.enum(["active", "inactive", "churned"]).optional().describe("Change client status"),
    notes: z.string().optional().describe("Additional notes"),
    tags: z.array(z.string()).optional().describe("Replace existing tags"),
    date_of_birth: z.string().optional().describe("Date of birth in YYYY-MM-DD format")
  }),
  execute: async (input, context) => {
    const resourceId = context?.agent?.resourceId;
    const supabase = getSupabaseServiceClient();
    const { clientId, ...fields } = input;
    const cleanUpdates = {};
    if (fields.name !== void 0) cleanUpdates.name = fields.name;
    if (fields.email !== void 0) cleanUpdates.email = fields.email;
    if (fields.phone !== void 0) cleanUpdates.phone = fields.phone;
    if (fields.company !== void 0) cleanUpdates.company = fields.company;
    if (fields.industry !== void 0) cleanUpdates.industry = fields.industry;
    if (fields.status !== void 0) cleanUpdates.status = fields.status;
    if (fields.notes !== void 0) cleanUpdates.notes = fields.notes;
    if (fields.tags !== void 0) cleanUpdates.tags = fields.tags;
    if (fields.date_of_birth !== void 0) cleanUpdates.date_of_birth = fields.date_of_birth;
    const { error } = await supabase.from("clients").update(cleanUpdates).eq("id", clientId).eq("owner_id", resourceId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: "Client updated successfully" };
  }
});
const deleteClientTool = createTool({
  id: "delete-client",
  description: "Delete/remove a client from your CRM. Use when the user wants to delete, remove, or archive a client. If you don't know the clientId, call readClients first with the client's name to get their ID.",
  inputSchema: z.object({
    clientId: z.string().describe("The UUID of the client to delete. Get this from readClients first if unknown.")
  }),
  execute: async ({ clientId }, context) => {
    const resourceId = context?.agent?.resourceId;
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("clients").delete().eq("id", clientId).eq("owner_id", resourceId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: "Client deleted successfully" };
  }
});

export { createClientTool, deleteClientTool, readClientsTool, updateClientTool };
