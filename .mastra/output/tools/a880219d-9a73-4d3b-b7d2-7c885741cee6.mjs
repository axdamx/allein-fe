import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { g as getSupabaseServerClient } from '../server.server.mjs';
import '@tanstack/react-start/server';
import '@supabase/ssr';
import 'ws';

const createTaskTool = createTool({
  id: "create-task",
  description: "Create a task in the planner. Use when the user wants to schedule, plan, add a to-do, or create a task. Extract the title, description, priority, dates from the conversation context \u2014 do not ask the user for details they already mentioned.",
  inputSchema: z.object({
    title: z.string().describe("Short title for the task"),
    description: z.string().optional().describe("Detailed description of the task"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium").describe("Priority level"),
    timeFrame: z.enum(["day", "week", "month", "quarter"]).optional().default("day").describe("Timeframe for the task"),
    plannedDate: z.string().optional().describe("Planned date in YYYY-MM-DD format"),
    dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    tags: z.array(z.string()).optional().describe("Tags to categorize the task")
  }),
  execute: async ({ title, description, priority, timeFrame, plannedDate, dueDate, tags }) => {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    const { createTaskImpl } = await import('../planner.server.mjs');
    const result = await createTaskImpl({
      title,
      description,
      status: "todo",
      priority,
      timeFrame,
      plannedDate,
      dueDate,
      tags
    });
    if ("error" in result) return { success: false, error: result.error };
    return { success: true, taskId: result.id, message: `Task "${title}" created` };
  }
});
const readTasksTool = createTool({
  id: "read-tasks",
  description: "Read or search tasks from the planner. Use when the user asks about their tasks, schedule, to-dos, or planner. Supports filtering by timeframe and planned date.",
  inputSchema: z.object({
    timeFrame: z.enum(["day", "week", "month", "quarter"]).optional().describe("Filter by timeframe"),
    plannedDate: z.string().optional().describe("Filter by planned date in YYYY-MM-DD format"),
    limit: z.number().min(1).max(50).optional().default(20).describe("Maximum number of tasks to return")
  }),
  execute: async ({ timeFrame, plannedDate, limit }) => {
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated", tasks: [] };
    let query = supabase.from("tasks").select("id, title, description, status, priority, time_frame, planned_date, due_date, tags, created_at").eq("owner_id", user.id).order("sort_order", { ascending: true });
    if (timeFrame) query = query.eq("time_frame", timeFrame);
    if (plannedDate) query = query.eq("planned_date", plannedDate);
    query = query.limit(limit ?? 20);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message, tasks: [] };
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
        tags: t.tags
      }))
    };
  }
});

export { createTaskTool, readTasksTool };
