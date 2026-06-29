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
  createTaskTool,
  readTasksTool,
} from '../tools'

export const legalAgent = new Agent({
  id: 'legal-agent',
  name: 'Legal Agent',
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
    readTasks: readTasksTool,
  },
  memory: new Memory({
    storage,
    vector: vectorStore,
    embedder: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
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
`,
      },
      semanticRecall: {
        topK: 3,
        messageRange: 2,
      },
    },
  }),
})
