import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getSubscriptionState,
  cancelSubscription,
  reactivateSubscription,
} from '@/server/subscriptions'
import type {
  CancelSubscriptionInput,
  ReactivateSubscriptionInput,
} from '@/lib/subscriptions'

const SUB_KEY = ['subscription-state'] as const

export function useSubscriptionState() {
  return useQuery({
    queryKey: SUB_KEY,
    queryFn: () => getSubscriptionState(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/** Invalidate everything a subscription change can affect. */
function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: SUB_KEY })
  qc.invalidateQueries({ queryKey: ['plan-state'] })
  qc.invalidateQueries({ queryKey: ['profile'] })
  qc.invalidateQueries({ queryKey: ['admin', 'users'] })
  qc.invalidateQueries({ queryKey: ['admin', 'billing'] })
}

/** Self-serve or admin cancel. Caller is responsible for UX text. */
export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CancelSubscriptionInput) =>
      cancelSubscription({ data: input }),
    onSuccess: (result, input) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        input.immediate
          ? 'Subscription canceled — your plan is now Free.'
          : 'Subscription scheduled to cancel at period end.',
      )
      invalidateAll(qc)
    },
  })
}

export function useReactivateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ReactivateSubscriptionInput) =>
      reactivateSubscription({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Subscription reactivated.')
      invalidateAll(qc)
    },
  })
}

/** Admin cancel — same mutation, separate hook for clarity at call sites. */
export function useAdminCancelSubscription() {
  return useCancelSubscription()
}
