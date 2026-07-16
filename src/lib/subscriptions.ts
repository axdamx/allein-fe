import type { PlanTier } from '@/lib/plans'

/** Mirrors subscription_status_enum, plus 'none' for no subscription row. */
export type SubscriptionStatus =
  | 'active'
  | 'canceled_pending'
  | 'canceled'
  | 'past_due'
  | 'none'

export type SubscriptionEventType =
  | 'canceled'
  | 'reactivated'
  | 'immediate_downgrade'
  | 'plan_changed'

/** What a subscriptions row looks like to the client (subset of columns). */
export interface SubscriptionRecord {
  id: string
  status: Exclude<SubscriptionStatus, 'none'>
  plan_tier: PlanTier
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  cancel_reason: string | null
}

/** Return type of getSubscriptionState — has derived flags for UI. */
export interface SubscriptionState {
  status: SubscriptionStatus
  plan: PlanTier
  subscription: SubscriptionRecord | null
  isCanceledPending: boolean
  isCanceled: boolean
  daysUntilPeriodEnd: number | null
}

export interface CancelSubscriptionInput {
  /** When omitted or equal to caller, cancels caller's own subscription (self-serve). */
  targetUserId?: string
  immediate: boolean
  reason?: string
}

export interface ReactivateSubscriptionInput {
  targetUserId?: string
}

export interface AdminUserSubscriptionResult {
  subscription: SubscriptionRecord | null
  recentEvents: Array<{
    id: string
    event_type: SubscriptionEventType
    reason: string | null
    old_plan: PlanTier | null
    new_plan: PlanTier | null
    effective_at: string
    created_at: string
  }>
}

/** Standard mutation result shape used across the codebase (see _errors.ts). */
export type MutationResult = { error: string } | null
