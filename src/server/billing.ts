import { createServerFn } from '@tanstack/react-start'

import { isCheckoutPlanTier } from '@/lib/billing'
import type { CheckoutPlanTier } from '@/lib/billing'

export type { BillingSummary } from '@/lib/billing'

export const getBillingSummary = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getBillingSummaryImpl } = await import('./billing.server')
    return getBillingSummaryImpl()
  },
)

export const createSubscriptionCheckout = createServerFn({ method: 'POST' })
  .validator((data: { plan: CheckoutPlanTier }) => {
    if (!isCheckoutPlanTier(data.plan)) {
      throw new Error('Invalid checkout plan')
    }
    return data
  })
  .handler(async ({ data }) => {
    const { createSubscriptionCheckoutImpl } = await import('./billing.server')
    return createSubscriptionCheckoutImpl(data.plan)
  })

export const createBillingPortal = createServerFn({ method: 'POST' }).handler(
  async () => {
    const { createBillingPortalImpl } = await import('./billing.server')
    return createBillingPortalImpl()
  },
)

