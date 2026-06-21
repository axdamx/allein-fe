/**
 * Public server functions for agent types + agents.
 *
 * Client-callable via RPC. Implementations live in agents.server.ts.
 */
import { createServerFn } from '@tanstack/react-start'
import type { AgentTypeKey } from '@/lib/agent-types'

export interface AgentTypeRow {
  key: AgentTypeKey
  label: string
  description: string | null
  icon: string | null
  accent_color: string
  system_prompt: string
  default_tools: string[]
  sidebar_items: { label: string; to: string }[]
  sort_order: number
}

export interface AgentRow {
  id: string
  owner_id: string
  type: AgentTypeKey
  name: string
  status: 'active' | 'paused' | 'draft' | 'archived'
  config: Record<string, string | number | boolean | null>
  system_prompt: string | null
  model: string
  avatar_url: string | null
  conversations_count: number
  leads_count: number
  created_at: string
  updated_at: string
}

export interface CreateAgentInput {
  type: AgentTypeKey
  name: string
  model?: string
  systemPrompt?: string
}

/** Fetch all active agent types (catalog). */
export const getAgentTypes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getAgentTypesImpl } = await import('./agents.server')
    return getAgentTypesImpl()
  },
)

/** Fetch all agents owned by the current user. */
export const getAgents = createServerFn({ method: 'GET' }).handler(async () => {
  const { getAgentsImpl } = await import('./agents.server')
  return getAgentsImpl()
})

/** Create a new agent. Enforces plan limit before inserting. */
export const createAgent = createServerFn({ method: 'POST' })
  .validator((d: CreateAgentInput) => d)
  .handler(async ({ data }) => {
    // Enforce plan limit first
    const { enforceLimitImpl } = await import('./profile.server')
    await enforceLimitImpl('agents')

    const { createAgentImpl } = await import('./agents.server')
    return createAgentImpl(data)
  })

/** Update an agent's status. */
export const updateAgentStatus = createServerFn({ method: 'POST' })
  .validator(
    (d: { agentId: string; status: 'active' | 'paused' | 'draft' | 'archived' }) =>
      d,
  )
  .handler(async ({ data }) => {
    const { updateAgentStatusImpl } = await import('./agents.server')
    return updateAgentStatusImpl(data.agentId, data.status)
  })
