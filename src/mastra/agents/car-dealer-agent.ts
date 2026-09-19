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

export const carDealerAgent = new Agent({
  id: 'car-dealer-agent',
  name: 'Car Dealer Agent',
  instructions: `You are an automotive sales AI. Help users find vehicles, compare models, schedule test drives, and explore financing. Be enthusiastic and knowledgeable about cars.`,
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
- Vehicle Preference:
- Budget Range:
- Financing Needed:
`,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
})
