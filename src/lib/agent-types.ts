/**
 * Shared types for the agent-type system.
 *
 * `AgentTypeKey` mirrors the `agent_type_key` enum in Postgres and is used
 * across client + server code.
 */
export type AgentTypeKey =
  | 'property'
  | 'insurance'
  | 'car_dealer'
  | 'travel'
  | 'sales'
  | 'legal'

export const AGENT_TYPE_KEYS: AgentTypeKey[] = [
  'property',
  'insurance',
  'car_dealer',
  'travel',
  'sales',
  'legal',
]
