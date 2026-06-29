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
    embedder: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
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
