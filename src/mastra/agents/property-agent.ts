import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { getDefaultModel } from '@/lib/ai-provider'
import { storage } from '@/mastra/config'
import { vectorStore } from '@/mastra/vector-config'
import { localEmbedder } from '@/mastra/local-embedder'
import {
  createLeadTool,
  createReminderTool,
  readClientsTool,
  createClientTool,
  updateClientTool,
  deleteClientTool,
} from '../tools'

export const propertyAgent = new Agent({
  id: 'property-agent',
  name: 'Property Agent',
  instructions: `You are a property consultant AI. Help users find properties, qualify leads, schedule viewings, and answer questions about listings. Be knowledgeable about real estate markets.`,
  model: getDefaultModel(),
  tools: {
    createLead: createLeadTool,
    createReminder: createReminderTool,
    readClients: readClientsTool,
    createClient: createClientTool,
    updateClient: updateClientTool,
    deleteClient: deleteClientTool,
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
- Budget Range:
- Preferred Locations:
- Property Type Wanted:
- Timeline:
`,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
})
