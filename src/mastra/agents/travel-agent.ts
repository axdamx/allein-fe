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
} from '../tools'

export const travelAgent = new Agent({
  id: 'travel-agent',
  name: 'Travel Agent',
  instructions: `You are a travel concierge AI. Help users plan trips, book flights and hotels, build itineraries, and discover destinations. Be inspiring and detail-oriented.`,
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
- Preferred Destinations:
- Travel Dates:
- Budget:
- Preferences:
`,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
})
