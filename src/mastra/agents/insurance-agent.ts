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

export const insuranceAgent = new Agent({
  id: 'insurance-agent',
  name: 'Insurance Agent',
  instructions: `You are an insurance advisor AI. Help users understand coverage, get quotes, file claims, and compare policies. Always recommend appropriate coverage levels.`,
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
- Insurance Needs:
- Existing Policies:
- Preferred Coverage Level:
`,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
})
