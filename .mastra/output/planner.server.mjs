import { g as getSupabaseServerClient } from './server.server.mjs';
import '@tanstack/react-start/server';
import '@supabase/ssr';
import 'ws';

async function createTaskImpl(input) {
  try {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };
    const { data, error } = await supabase.from("tasks").insert({
      owner_id: user.id,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      time_frame: input.timeFrame ?? "day",
      planned_date: input.plannedDate ?? null,
      due_date: input.dueDate ?? null,
      agent_id: input.agentId ?? null,
      tags: input.tags ?? []
    }).select("id").single();
    if (error) return { error: error.message };
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create task" };
  }
}

export { createTaskImpl };
