/**
 * Server-only implementation for agent types + agents.
 *
 * All DB access lives here (.server.ts) so it never reaches the client bundle.
 */
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { DEFAULT_MODEL } from '@/lib/ai'
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
export async function getAgentTypesImpl(): Promise<AgentTypeRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('agent_types')
    .select(
      'key, label, description, icon, accent_color, system_prompt, default_tools, sidebar_items, sort_order, is_active',
    )
    .eq('is_active', true)
    .order('sort_order')

  if (error || !data) return []
  return data as unknown as AgentTypeRow[]
}

/** Fetch all agents owned by the current user. */
export async function getAgentsImpl(): Promise<AgentRow[]> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as AgentRow[]
}

/** Create a new agent for the current user. */
export async function createAgentImpl(
  input: CreateAgentInput,
): Promise<{ id: string } | { error: string }> {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the user's profile to check agent_type
  const { data: profile } = await supabase
    .from('profiles')
    .select('agent_type')
    .eq('id', user.id)
    .single()

  // If the user has an agent_type set, enforce it
  if (profile?.agent_type && profile.agent_type !== input.type) {
    return { error: `You can only create ${profile.agent_type.replace('_', ' ')} agents.` }
  }

  // Insert the agent
  const { data, error } = await supabase
    .from('agents')
    .insert({
      owner_id: user.id,
      type: input.type,
      name: input.name,
      model: input.model ?? DEFAULT_MODEL,
      system_prompt: input.systemPrompt ?? null,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Increment the owner's agents_count usage counter
  await supabase.rpc('increment_usage', {
    p_user_id: user.id,
    p_metric: 'agents_count',
    p_amount: 1,
  })

  return { id: data.id }
}

/** Update an agent's status (pause/resume/archive). */
export async function updateAgentStatusImpl(
  agentId: string,
  status: 'active' | 'paused' | 'draft' | 'archived',
): Promise<{ error: string } | null> {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase
    .from('agents')
    .update({ status })
    .eq('id', agentId)

  if (error) return { error: error.message }
  return null
}
