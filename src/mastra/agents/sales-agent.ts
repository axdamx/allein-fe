import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { localEmbedder } from '@/mastra/local-embedder'
import { getDefaultModel } from '@/lib/ai-provider'
import { storage } from '@/mastra/config'
import { vectorStore } from '@/mastra/vector-config'
import {
  createLeadTool,
  createReminderTool,
  readClientsTool,
  createClientTool,
  updateClientTool,
  deleteClientTool,
  sendWhatsAppTool,
  sendTelegramTool,
} from '../tools'

export const salesAgent = new Agent({
  id: 'sales-agent',
  name: 'Sales Agent',
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
    sendTelegram: sendTelegramTool,
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: localEmbedder,
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Industry:
- Target Audience:
- Current Pipeline Value:
      `,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
})
