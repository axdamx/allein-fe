import { g as getSupabaseServerClient } from './server.server.mjs';
import '@tanstack/react-start/server';
import '@supabase/ssr';
import 'ws';

async function createClientImpl(input) {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data, error } = await supabase.from("clients").insert({
    owner_id: user.id,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    company: input.company ?? null,
    website: input.website ?? null,
    industry: input.industry ?? null,
    status: input.status ?? "active",
    notes: input.notes ?? null,
    tags: input.tags ?? [],
    date_of_birth: input.date_of_birth ?? null
  }).select("id").single();
  if (error) return { error: error.message };
  return { id: data.id };
}
async function updateClientImpl(input) {
  const supabase = getSupabaseServerClient();
  const { id, ...updates } = input;
  const cleanUpdates = {};
  if (updates.name !== void 0) cleanUpdates.name = updates.name;
  if (updates.email !== void 0) cleanUpdates.email = updates.email;
  if (updates.phone !== void 0) cleanUpdates.phone = updates.phone;
  if (updates.company !== void 0) cleanUpdates.company = updates.company;
  if (updates.website !== void 0) cleanUpdates.website = updates.website;
  if (updates.industry !== void 0) cleanUpdates.industry = updates.industry;
  if (updates.status !== void 0) cleanUpdates.status = updates.status;
  if (updates.notes !== void 0) cleanUpdates.notes = updates.notes;
  if (updates.tags !== void 0) cleanUpdates.tags = updates.tags;
  if (updates.date_of_birth !== void 0) cleanUpdates.date_of_birth = updates.date_of_birth;
  const { error } = await supabase.from("clients").update(cleanUpdates).eq("id", id);
  if (error) return { error: error.message };
  return null;
}
async function deleteClientImpl(clientId) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { error: error.message };
  return null;
}

export { createClientImpl, deleteClientImpl, updateClientImpl };
