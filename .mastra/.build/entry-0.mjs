import { Mastra } from '@mastra/core';
import { Observability, MastraStorageExporter } from '@mastra/observability';
import { LibSQLStore, LibSQLVector } from '@mastra/libsql';
import { PostgresStore, PgVector } from '@mastra/pg';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ModelRouterEmbeddingModel } from '@mastra/core/llm';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { setCookie, getCookies } from '@tanstack/react-start/server';
import ws from 'ws';
import twilio from 'twilio';
import { Bot } from 'grammy';

const dbUrl = process.env.SUPABASE_DATABASE_URL;
const storage = dbUrl ? new PostgresStore({ id: "allein-storage", connectionString: dbUrl }) : new LibSQLStore({ id: "allein-storage", url: "file:./mastra.db" });
const vectorStore = dbUrl ? new PgVector({ id: "allein-vector", connectionString: dbUrl }) : new LibSQLVector({ id: "allein-vector", url: "file:./mastra.db" });

globalThis.AI_SDK_LOG_WARNINGS = false;
const baseURL = process.env.LLM_BASE_URL || "https://api.z.ai/api/paas/v4";
const provider = createOpenAICompatible({
  name: "zai",
  baseURL,
  apiKey: process.env.LLM_API_KEY
});
const DEFAULT_MODEL_ID = process.env.LLM_DEFAULT_MODEL || "glm-4.5-flash";
const getDefaultModel = () => {
  return provider(DEFAULT_MODEL_ID);
};
const getModel = (modelId) => {
  return provider(modelId);
};

const SUPABASE_URL$1 = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL$1 || !SERVICE_ROLE_KEY) {
  throw new Error(
    `[supabase/service] Missing env vars. SUPABASE_URL=${SUPABASE_URL$1 ?? "undefined"} SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY ? "set" : "undefined"}.`
  );
}
let client$1 = null;
function getSupabaseServiceClient() {
  if (!client$1) {
    client$1 = createServerClient(SUPABASE_URL$1, SERVICE_ROLE_KEY, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
        }
      }
    });
  }
  return client$1;
}

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
  execute: async ({ name, email, phone, company, notes }, context) => {
    const { resourceId: ownerId } = context;
    const supabase = getSupabaseServiceClient();
    const { enforceLimitImpl } = await Promise.resolve().then(function () { return profile_server; });
    try {
      await enforceLimitImpl("leads");
    } catch {
      return { success: false, error: "Lead limit reached on your current plan." };
    }
    const { data, error } = await supabase.from("leads").insert({
      owner_id: ownerId,
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
  execute: async ({ title, description, due_at, lead_id, lead_name }, context) => {
    const { resourceId: ownerId } = context;
    const supabase = getSupabaseServiceClient();
    let resolvedLeadId = lead_id;
    if (!resolvedLeadId && lead_name) {
      const { data: lead } = await supabase.from("leads").select("id").eq("owner_id", ownerId).ilike("name", lead_name).maybeSingle();
      if (lead) resolvedLeadId = lead.id;
    }
    const { data, error } = await supabase.from("reminders").insert({
      owner_id: ownerId,
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
    const { resourceId } = context;
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
    const { resourceId } = context;
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
    const { resourceId } = context;
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
    const { resourceId } = context;
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.from("clients").delete().eq("id", clientId).eq("owner_id", resourceId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: "Client deleted successfully" };
  }
});

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
  execute: async ({ title, description, priority, timeFrame, plannedDate, dueDate, tags }, context) => {
    const { resourceId } = context;
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.from("tasks").insert({
      owner_id: resourceId,
      title,
      description: description ?? null,
      status: "todo",
      priority: priority ?? "medium",
      time_frame: timeFrame ?? "day",
      planned_date: plannedDate ?? null,
      due_date: dueDate ?? null,
      tags: tags ?? []
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    return { success: true, taskId: data.id, message: `Task "${title}" created` };
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
  execute: async ({ timeFrame, plannedDate, limit }, context) => {
    const { resourceId } = context;
    const supabase = getSupabaseServiceClient();
    let query = supabase.from("tasks").select("id, title, description, status, priority, time_frame, planned_date, due_date, tags, created_at").eq("owner_id", resourceId).order("sort_order", { ascending: true });
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

const sendWhatsAppTool = createTool({
  id: "send-whatsapp",
  description: "Send a WhatsApp message to a contact. Use when the user wants to message a lead, customer, or prospect on WhatsApp. Requires their phone number with country code.",
  inputSchema: z.object({
    to: z.string().describe("Recipient phone number with country code (e.g. 60123456789)"),
    message: z.string().describe("Message body to send"),
    leadId: z.string().optional().describe("Lead ID to log this message against")
  }),
  execute: async ({ to, message, leadId }, context) => {
    const { resourceId } = context;
    const { sendWhatsApp } = await Promise.resolve().then(function () { return index; });
    const result = await sendWhatsApp(to, message);
    if (!result.success) return result;
    if (leadId) {
      const supabase = getSupabaseServiceClient();
      await supabase.from("leads").update({ last_contacted_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", leadId).eq("owner_id", resourceId);
    }
    return {
      success: true,
      message: `WhatsApp message sent to ${to}`,
      messageId: result.messageId
    };
  }
});
const sendTelegramTool = createTool({
  id: "send-telegram",
  description: "Send a Telegram message to a contact. Use when the user wants to message a lead, customer, or prospect on Telegram, or send info to their own Telegram. The user's Telegram chat ID is available in the User Context \u2014 use that when the user says 'send to my Telegram'.",
  inputSchema: z.object({
    chatId: z.string().describe("Telegram chat ID of the recipient (numeric string). For sending to the user themselves, use the Telegram chat ID from User Context."),
    message: z.string().describe("Message body to send")
  }),
  execute: async ({ chatId, message }) => {
    const { sendTelegram } = await Promise.resolve().then(function () { return index; });
    const result = await sendTelegram(chatId, message);
    if (!result.success) return result;
    return {
      success: true,
      message: `Telegram message sent to chat ${chatId}`,
      messageId: result.messageId
    };
  }
});

const propertyAgent = new Agent({
  id: "property-agent",
  name: "Property Agent",
  instructions: `You are a property consultant AI. Help users find properties, qualify leads, schedule viewings, and answer questions about listings. Be knowledgeable about real estate markets.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Budget Range:
- Preferred Locations:
- Property Type Wanted:
- Timeline:
`
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2
      }
    }
  })
});

const insuranceAgent = new Agent({
  id: "insurance-agent",
  name: "Insurance Agent",
  instructions: `You are an insurance advisor AI. Help users understand coverage, get quotes, file claims, and compare policies. Always recommend appropriate coverage levels.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Insurance Needs:
- Existing Policies:
- Preferred Coverage Level:
`
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2
      }
    }
  })
});

const carDealerAgent = new Agent({
  id: "car-dealer-agent",
  name: "Car Dealer Agent",
  instructions: `You are an automotive sales AI. Help users find vehicles, compare models, schedule test drives, and explore financing. Be enthusiastic and knowledgeable about cars.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Vehicle Preference:
- Budget Range:
- Financing Needed:
`
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2
      }
    }
  })
});

const travelAgent = new Agent({
  id: "travel-agent",
  name: "Travel Agent",
  instructions: `You are a travel concierge AI. Help users plan trips, book flights and hotels, build itineraries, and discover destinations. Be inspiring and detail-oriented.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Preferred Destinations:
- Travel Dates:
- Budget:
- Preferences:
`
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2
      }
    }
  })
});

const salesAgent = new Agent({
  id: "sales-agent",
  name: "Sales Agent",
  instructions: `You are a sales development AI. Help users nurture leads, write outreach emails, qualify opportunities, and move deals through the pipeline. Be persuasive and data-driven.

You have access to messaging tools for reaching out to leads and contacts. Use them proactively when the user wants to follow up or send information.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool,
    sendWhatsApp: sendWhatsAppTool,
    sendTelegram: sendTelegramTool
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Industry:
- Target Audience:
- Current Pipeline Value:
      `
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2
      }
    }
  })
});

const legalAgent = new Agent({
  id: "legal-agent",
  name: "Legal Agent",
  instructions: `You are a legal intake assistant AI. Help users understand legal processes, review documents for basic issues, schedule consultations, and intake matters. Always clarify you are not providing formal legal advice.

When scheduling consultations or intake matters, create leads, reminders, and tasks to track the process.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool,
    createTask: createTaskTool,
    readTasks: readTasksTool
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel("openai/text-embedding-3-small"),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# Client Profile
- Name:
- Legal Matter Type:
- Case Status:
- Key Deadlines:
- Consultations Scheduled:
`
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2
      }
    }
  })
});

const vectors = {
  "allein-vector": vectorStore
};
const observability = process.env.MASTRA_PLATFORM_ACCESS_TOKEN ? new Observability({
  configs: {
    default: {
      serviceName: "allein",
      exporters: [new MastraStorageExporter()]
    }
  }
}) : void 0;
const mastra = new Mastra({
  storage,
  vectors,
  ...observability ? {
    observability
  } : {},
  agents: {
    property: propertyAgent,
    insurance: insuranceAgent,
    car_dealer: carDealerAgent,
    travel: travelAgent,
    sales: salesAgent,
    legal: legalAgent
  }
});
function getMastra() {
  return mastra;
}
function getAgentByType(type) {
  const id = `${type}-agent`;
  try {
    return mastra.getAgentById(id);
  } catch {
    return null;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    `[supabase] Missing env vars. SUPABASE_URL=${SUPABASE_URL ?? "undefined"} SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY ? "set" : "undefined"}. Check your .env file and that vite.config.ts loads it.`
  );
}
const RESOLVED_URL = SUPABASE_URL;
const RESOLVED_KEY = SUPABASE_ANON_KEY;
function getSupabaseServerClient() {
  return createServerClient(RESOLVED_URL, RESOLVED_KEY, {
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({
          name,
          value
        }));
      },
      setAll(cookies) {
        cookies.forEach((cookie) => {
          setCookie(cookie.name, cookie.value);
        });
      }
    },
    realtime: {
      transport: ws
    }
  });
}

const PLAN_CONFIGS = {
  free: {
    tier: "free",
    label: "Free",
    price: 0,
    tagline: "Explore the platform with one AI agent.",
    cta: "Get started",
    accent: "#64748b",
    limits: {
      agents: { max: 1 },
      conversations: { max: 10 },
      messages: { max: 100 },
      posts: { max: 5 },
      documents: { max: 3 },
      leads: { max: 10 },
      whatsappMessages: { max: 0 },
      telegramMessages: { max: 0 }
    },
    features: {
      crm: false,
      clients: false,
      marketingStudio: false,
      aiImageGen: false,
      aiVideoGen: false,
      ragDocuments: false,
      scheduledPosts: false,
      teamSeats: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      whatsappBroadcast: false,
      telegramBot: false
    }
  },
  lite: {
    tier: "lite",
    label: "Lite",
    price: 29,
    tagline: "For solo operators running a single agent type.",
    cta: "Choose Lite",
    accent: "#3b82f6",
    limits: {
      agents: { max: 3 },
      conversations: { max: 100 },
      messages: { max: 2e3 },
      posts: { max: 30 },
      documents: { max: 25 },
      leads: { max: 500 },
      whatsappMessages: { max: 50 },
      telegramMessages: { max: 100 }
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: false,
      aiVideoGen: false,
      ragDocuments: true,
      scheduledPosts: true,
      teamSeats: false,
      apiAccess: false,
      whiteLabel: false,
      prioritySupport: false,
      whatsappBroadcast: false,
      telegramBot: true
    }
  },
  pro: {
    tier: "pro",
    label: "Pro",
    price: 99,
    tagline: "Full power \u2014 all agent types, marketing studio, and RAG.",
    cta: "Choose Pro",
    featured: true,
    accent: "#6366f1",
    limits: {
      agents: { max: 10 },
      conversations: { max: null },
      // unlimited
      messages: { max: null },
      posts: { max: 150 },
      documents: { max: 200 },
      leads: { max: null },
      whatsappMessages: { max: null },
      telegramMessages: { max: null }
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: true,
      aiVideoGen: false,
      ragDocuments: true,
      scheduledPosts: true,
      teamSeats: true,
      apiAccess: true,
      whiteLabel: false,
      prioritySupport: true,
      whatsappBroadcast: true,
      telegramBot: true
    }
  },
  custom: {
    tier: "custom",
    label: "Custom",
    price: null,
    tagline: "Enterprise scale with white-label and video generation.",
    cta: "Contact sales",
    accent: "#0f172a",
    limits: {
      agents: { max: null },
      conversations: { max: null },
      messages: { max: null },
      posts: { max: null },
      documents: { max: null },
      leads: { max: null },
      whatsappMessages: { max: null },
      telegramMessages: { max: null }
    },
    features: {
      crm: true,
      clients: true,
      marketingStudio: true,
      aiImageGen: true,
      aiVideoGen: true,
      ragDocuments: true,
      scheduledPosts: true,
      teamSeats: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
      whatsappBroadcast: true,
      telegramBot: true
    }
  }
};
const PLAN_ORDER = ["free", "lite", "pro", "custom"];
const isHigherTier = (from, to) => {
  return PLAN_ORDER.indexOf(to) > PLAN_ORDER.indexOf(from);
};
const minTierForFeature = (feature) => {
  for (const tier of PLAN_ORDER) {
    if (PLAN_CONFIGS[tier].features[feature]) return tier;
  }
  return null;
};
const minTierForLimit = (metric, requiredCount) => {
  for (const tier of PLAN_ORDER) {
    const { max } = PLAN_CONFIGS[tier].limits[metric];
    if (max === null || max >= requiredCount) return tier;
  }
  return null;
};

async function getCurrentUserProfile() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile, error } = await supabase.from("profiles").select(
    "id, email, plan, role, agents_count, conversations_count, messages_count, posts_count, documents_count, whatsapp_messages_count, telegram_messages_count, agent_type"
  ).eq("id", user.id).single();
  if (error || !profile) return null;
  return profile;
}
async function countUserLeads(userId) {
  const supabase = getSupabaseServerClient();
  const { count } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("owner_id", userId);
  return count ?? 0;
}
function computeRemaining(used, max) {
  if (max === null) return null;
  return Math.max(0, max - used);
}
function buildPlanState(profile, leadsCount = 0) {
  const config = PLAN_CONFIGS[profile.plan] ?? PLAN_CONFIGS.free;
  const usage = {
    agents: profile.agents_count ?? 0,
    conversations: profile.conversations_count ?? 0,
    messages: profile.messages_count ?? 0,
    posts: profile.posts_count ?? 0,
    documents: profile.documents_count ?? 0,
    leads: leadsCount,
    whatsappMessages: profile.whatsapp_messages_count ?? 0,
    telegramMessages: profile.telegram_messages_count ?? 0
  };
  const remaining = {
    agents: computeRemaining(usage.agents, config.limits.agents.max),
    conversations: computeRemaining(
      usage.conversations,
      config.limits.conversations.max
    ),
    messages: computeRemaining(usage.messages, config.limits.messages.max),
    posts: computeRemaining(usage.posts, config.limits.posts.max),
    documents: computeRemaining(usage.documents, config.limits.documents.max),
    leads: computeRemaining(usage.leads, config.limits.leads.max),
    whatsappMessages: computeRemaining(
      usage.whatsappMessages,
      config.limits.whatsappMessages.max
    ),
    telegramMessages: computeRemaining(
      usage.telegramMessages,
      config.limits.telegramMessages.max
    )
  };
  return {
    tier: profile.plan,
    usage,
    remaining,
    features: config.features
  };
}
async function getPlanStateImpl() {
  const profile = await getCurrentUserProfile();
  if (!profile) return null;
  const leadsCount = await countUserLeads(profile.id);
  return buildPlanState(profile, leadsCount);
}
async function enforceLimitImpl(metric) {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Not authenticated");
  const config = PLAN_CONFIGS[profile.plan] ?? PLAN_CONFIGS.free;
  const { max } = config.limits[metric];
  if (max === null) return;
  if (metric === "leads") {
    const leadsCount = await countUserLeads(profile.id);
    if (leadsCount >= max) {
      const requiredTier = minTierForLimit(metric, leadsCount + 1);
      const err = new Error(
        `Plan limit reached: ${metric} (${leadsCount}/${max}) on the ${profile.plan} plan.` + (requiredTier ? ` Upgrade to ${requiredTier}.` : "")
      );
      err.name = "PlanLimitError";
      Object.assign(err, { metric, currentTier: profile.plan, requiredTier, used: leadsCount, max });
      throw err;
    }
    return;
  }
  const used = metric === "agents" ? profile.agents_count : metric === "conversations" ? profile.conversations_count : metric === "messages" ? profile.messages_count : metric === "posts" ? profile.posts_count : metric === "whatsappMessages" ? profile.whatsapp_messages_count ?? 0 : metric === "telegramMessages" ? profile.telegram_messages_count ?? 0 : profile.documents_count;
  if (used >= max) {
    const requiredTier = minTierForLimit(metric, used + 1);
    const maxLabel = max === null ? "unlimited" : String(max);
    const err = new Error(
      `Plan limit reached: ${metric} (${used}/${maxLabel}) on the ${profile.plan} plan.` + (requiredTier ? ` Upgrade to ${requiredTier}.` : "")
    );
    err.name = "PlanLimitError";
    Object.assign(err, {
      metric,
      currentTier: profile.plan,
      requiredTier,
      used,
      max
    });
    throw err;
  }
}
async function requireFeatureImpl(feature) {
  const profile = await getCurrentUserProfile();
  if (!profile) throw new Error("Not authenticated");
  const config = PLAN_CONFIGS[profile.plan] ?? PLAN_CONFIGS.free;
  if (!config.features[feature]) {
    const requiredTier = minTierForFeature(feature);
    const err = new Error(
      `Feature "${feature}" is not available on the ${profile.plan} plan.` + (requiredTier ? ` Upgrade to ${requiredTier}.` : "")
    );
    err.name = "FeatureNotAvailableError";
    Object.assign(err, { feature, currentTier: profile.plan, requiredTier });
    throw err;
  }
}

var profile_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  buildPlanState: buildPlanState,
  enforceLimitImpl: enforceLimitImpl,
  getCurrentUserProfile: getCurrentUserProfile,
  getPlanStateImpl: getPlanStateImpl,
  requireFeatureImpl: requireFeatureImpl
});

let client = null;
const getClient = () => {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set"
      );
    }
    client = twilio(sid, token);
  }
  return client;
};
const sendWhatsApp = async (to, body) => {
  try {
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!fromNumber) {
      return { success: false, error: "TWILIO_WHATSAPP_NUMBER not configured" };
    }
    const msg = await getClient().messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${to}`,
      body
    });
    return { success: true, messageId: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
const formatInboundWhatsApp = (formData) => {
  const from = formData.get("From").replace("whatsapp:", "");
  const body = formData.get("Body") ?? "";
  const messageSid = formData.get("MessageSid") ?? "";
  const profileName = formData.get("ProfileName") ?? void 0;
  return { from, body, messageSid, profileName };
};
const twilioTextResponse = (message) => {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    {
      status: 200,
      headers: { "Content-Type": "application/xml" }
    }
  );
};
const twilioEmptyResponse = () => {
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    {
      status: 200,
      headers: { "Content-Type": "application/xml" }
    }
  );
};

let bot = null;
const getBot = () => {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be set");
    }
    bot = new Bot(token);
  }
  return bot;
};
const sendTelegram = async (chatId, text) => {
  try {
    const msg = await getBot().api.sendMessage(Number(chatId), text);
    return { success: true, messageId: msg.message_id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
};
const parseTelegramUpdate = (update) => {
  if (!update.message || typeof update.message !== "object") return null;
  const msg = update.message;
  const chat = msg.chat;
  if (!chat || typeof chat.id !== "number") return null;
  const chatId = chat.id;
  const from = msg.from;
  const username = from?.username;
  const firstName = from?.first_name;
  const text = msg.text;
  if (text === "/start") {
    return { chatId, username, firstName, type: "start" };
  }
  if (text) {
    return { chatId, text, username, firstName, type: "message" };
  }
  return { chatId, type: "other" };
};
const getTelegramWebhookUrl = (baseUrl) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return `${baseUrl.replace(/\/$/, "")}/api/messaging/telegram`;
};
const setTelegramWebhook = async (url) => {
  await getBot().api.setWebhook(url);
};
const deleteTelegramWebhook = async () => {
  await getBot().api.deleteWebhook();
};

var index = /*#__PURE__*/Object.freeze({
  __proto__: null,
  deleteTelegramWebhook: deleteTelegramWebhook,
  formatInboundWhatsApp: formatInboundWhatsApp,
  getTelegramWebhookUrl: getTelegramWebhookUrl,
  parseTelegramUpdate: parseTelegramUpdate,
  sendTelegram: sendTelegram,
  sendWhatsApp: sendWhatsApp,
  setTelegramWebhook: setTelegramWebhook,
  twilioEmptyResponse: twilioEmptyResponse,
  twilioTextResponse: twilioTextResponse
});

export { getAgentByType, getMastra, mastra };
