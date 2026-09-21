import Stripe from 'stripe'

import { isCheckoutPlanTier } from '@/lib/billing'
import type {
  CheckoutPlanTier,
  StripeSubscriptionStatus,
} from '@/lib/billing'

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: {
      name: 'Allein',
      version: '0.0.0',
    },
  })

  return stripeClient
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  return secret
}

export function getBillingAppUrl(): string {
  const configured = process.env.APP_URL?.trim()
  if (configured) {
    const url = new URL(configured)
    const localHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    if (url.protocol !== 'https:' && !localHttp) {
      throw new Error('APP_URL must use HTTPS outside local development')
    }
    return url.origin
  }
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000'
  throw new Error('APP_URL is not configured')
}

export function getStripePriceId(plan: CheckoutPlanTier): string {
  const key =
    plan === 'lite'
      ? 'STRIPE_PRICE_LITE_MONTHLY'
      : 'STRIPE_PRICE_PRO_MONTHLY'
  const priceId = process.env[key]?.trim()
  if (!priceId) throw new Error(`${key} is not configured`)
  return priceId
}

export function planForStripePrice(
  priceId: string,
  metadataPlan?: string,
): CheckoutPlanTier {
  const configured = Object.fromEntries(
    (['lite', 'pro'] as const).map((plan) => [getStripePriceId(plan), plan]),
  )
  const configuredPlan = configured[priceId]
  if (configuredPlan) return configuredPlan

  // The metadata fallback keeps existing subscriptions valid after a Stripe
  // Price is archived and replaced. Metadata is written by our server only.
  if (metadataPlan && isCheckoutPlanTier(metadataPlan)) return metadataPlan
  throw new Error(`Unknown Stripe price: ${priceId}`)
}

export function isStripeSubscriptionStatus(
  value: string,
): value is StripeSubscriptionStatus {
  return [
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'paused',
    'trialing',
    'unpaid',
  ].includes(value)
}
