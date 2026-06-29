import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { getDefaultModel } from '@/lib/ai-provider'
import { storage, vectorStore } from '@/mastra/config'
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
    embedder: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
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
