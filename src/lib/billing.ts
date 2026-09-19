import type { PlanTier } from '@/lib/plans'

export const CHECKOUT_PLAN_TIERS = ['lite', 'pro'] as const

export type CheckoutPlanTier = (typeof CHECKOUT_PLAN_TIERS)[number]

export type StripeSubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'

export interface BillingSummary {
  provider: 'none' | 'manual' | 'stripe'
  plan: PlanTier
  status: StripeSubscriptionStatus | 'none'
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canManage: boolean
}

export function isCheckoutPlanTier(
  value: string,
): value is CheckoutPlanTier {
  return CHECKOUT_PLAN_TIERS.includes(value as CheckoutPlanTier)
}

