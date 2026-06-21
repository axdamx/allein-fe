import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAgentTypes,
  getAgents,
  createAgent,
  updateAgentStatus,
  type AgentTypeRow,
  type AgentRow,
  type CreateAgentInput,
} from '@/server/agents'

/** Fetch the agent type catalog. */
export function useAgentTypes() {
  return useQuery({
    queryKey: ['agent-types'],
    queryFn: () => getAgentTypes(),
    staleTime: 10 * 60 * 1000, // catalog rarely changes
  })
}

/** Fetch the current user's agents. */
export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
    staleTime: 30 * 1000,
  })
}

/** Create a new agent. Invalidates the agents + plan queries on success. */
export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAgentInput) => createAgent({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Agent created')
      qc.invalidateQueries({ queryKey: ['agents'] })
      qc.invalidateQueries({ queryKey: ['plan-state'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create agent'
      toast.error(msg)
    },
  })
}

/** Update an agent's status (pause/resume/archive). */
export function useUpdateAgentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { agentId: string; status: AgentRow['status'] }) =>
      updateAgentStatus({ data: vars }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      qc.invalidateQueries({ queryKey: ['agents'] })
    },
  })
}

export type { AgentTypeRow, AgentRow, CreateAgentInput }
