import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CheckoutPlanTier } from '@/lib/billing'
import {
  createBillingPortal,
  createSubscriptionCheckout,
  getBillingSummary,
} from '@/server/billing'

function messageForError(error: unknown): string {
  return error instanceof Error ? error.message : 'Billing is unavailable'
}

export function useBillingSummary() {
  return useQuery({
    queryKey: ['billing-summary'],
    queryFn: getBillingSummary,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}

export function useStartSubscriptionCheckout() {
  return useMutation({
    mutationFn: async (plan: CheckoutPlanTier) => {
      const result = await createSubscriptionCheckout({ data: { plan } })
      if ('error' in result) throw new Error(result.error)
      return result.url
    },
    onSuccess: (url) => window.location.assign(url),
    onError: (error) => toast.error(messageForError(error)),
  })
}

export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const result = await createBillingPortal()
      if ('error' in result) throw new Error(result.error)
      return result.url
    },
    onSuccess: (url) => window.location.assign(url),
    onError: (error) => toast.error(messageForError(error)),
  })
}

