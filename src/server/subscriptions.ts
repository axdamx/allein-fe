import { createServerFn } from '@tanstack/react-start'

export type {
  SubscriptionStatus,
  SubscriptionEventType,
  SubscriptionRecord,
  SubscriptionState,
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
  AdminUserSubscriptionResult,
  MutationResult,
} from '@/lib/subscriptions'

import type {
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
} from '@/lib/subscriptions'

export const getSubscriptionState = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSubscriptionStateImpl } = await import('./subscriptions.server')
    return getSubscriptionStateImpl()
  },
)

export const cancelSubscription = createServerFn({ method: 'POST' })
  .validator((d: CancelSubscriptionInput) => d)
  .handler(async ({ data }) => {
    const { cancelSubscriptionImpl } = await import('./subscriptions.server')
    return cancelSubscriptionImpl(data)
  })

export const reactivateSubscription = createServerFn({ method: 'POST' })
  .validator((d: ReactivateSubscriptionInput) => d)
  .handler(async ({ data }) => {
    const { reactivateSubscriptionImpl } = await import('./subscriptions.server')
    return reactivateSubscriptionImpl(data)
  })

export const adminGetUserSubscription = createServerFn({ method: 'POST' })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { adminGetUserSubscriptionImpl } = await import(
      './subscriptions.server'
    )
    return adminGetUserSubscriptionImpl(data)
  })
