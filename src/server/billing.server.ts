import type Stripe from 'stripe'

import type {
  BillingSummary,
  CheckoutPlanTier,
  StripeSubscriptionStatus,
} from '@/lib/billing'
import {
  getBillingAppUrl,
  getStripeClient,
  getStripePriceId,
  getStripeWebhookSecret,
  isStripeSubscriptionStatus,
  planForStripePrice,
} from '@/lib/billing/stripe.server'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { getSupabaseServiceClient } from '@/lib/supabase/service.server'
import { safeError } from '@/server/_errors'
import type { PlanTier } from '@/lib/plans'

const ACTIVE_SUBSCRIPTION_STATUSES: StripeSubscriptionStatus[] = [
  'active',
  'trialing',
  'past_due',
]

interface BillingSubscriptionRow {
  plan_tier: PlanTier
  status: StripeSubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
}

async function getAuthenticatedBillingUser() {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, plan')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null
  return {
    user,
    profile: profile as { id: string; email: string; plan: PlanTier },
  }
}

async function getStripeCustomerId(ownerId: string): Promise<string | null> {
  const service = getSupabaseServiceClient()
  const { data, error } = await service
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw error
  return data?.stripe_customer_id ?? null
}

export async function getBillingSummaryImpl(): Promise<
  BillingSummary | { error: string }
> {
  try {
    const account = await getAuthenticatedBillingUser()
    if (!account) return { error: 'Not authenticated' }

    const service = getSupabaseServiceClient()
    const [subscriptionResult, customerResult] = await Promise.all([
      service
        .from('billing_subscriptions')
        .select('plan_tier, status, current_period_end, cancel_at_period_end')
        .eq('owner_id', account.user.id)
        .maybeSingle(),
      service
        .from('billing_customers')
        .select('stripe_customer_id')
        .eq('owner_id', account.user.id)
        .maybeSingle(),
    ])

    if (subscriptionResult.error) throw subscriptionResult.error
    if (customerResult.error) throw customerResult.error

    const subscription =
      subscriptionResult.data as BillingSubscriptionRow | null

    return {
      provider: subscription
        ? 'stripe'
        : account.profile.plan === 'free'
          ? 'none'
          : 'manual',
      plan: account.profile.plan,
      status: subscription?.status ?? 'none',
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      canManage: Boolean(customerResult.data?.stripe_customer_id),
    }
  } catch (error) {
    return { error: safeError(error, 'Failed to load billing details') }
  }
}

export async function createSubscriptionCheckoutImpl(
  plan: CheckoutPlanTier,
): Promise<{ url: string } | { error: string }> {
  try {
    const account = await getAuthenticatedBillingUser()
    if (!account) return { error: 'Not authenticated' }

    const service = getSupabaseServiceClient()
    const { data: current, error: subscriptionError } = await service
      .from('billing_subscriptions')
      .select('status')
      .eq('owner_id', account.user.id)
      .maybeSingle()
    if (subscriptionError) throw subscriptionError

    if (
      current?.status &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(
        current.status as StripeSubscriptionStatus,
      )
    ) {
      return {
        error: 'You already have an active subscription. Manage it in the billing portal.',
      }
    }

    // Paid profiles without an active Stripe subscription are complimentary
    // or admin-managed accounts. Starting an incomplete Checkout subscription
    // must never overwrite that manual entitlement with Free.
    if (account.profile.plan !== 'free') {
      return {
        error: 'This plan is managed manually. Contact billing support to move it to Stripe.',
      }
    }

    const customerId = await getStripeCustomerId(account.user.id)
    const appUrl = getBillingAppUrl()
    const checkout = await getStripeClient().checkout.sessions.create({
      mode: 'subscription',
      ...(customerId
        ? { customer: customerId }
        : { customer_email: account.profile.email || account.user.email }),
      client_reference_id: account.user.id,
      line_items: [{ price: getStripePriceId(plan), quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      metadata: { ownerId: account.user.id, plan },
      subscription_data: {
        metadata: { ownerId: account.user.id, plan },
      },
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=canceled`,
    })

    if (!checkout.url) throw new Error('Stripe did not return a checkout URL')
    return { url: checkout.url }
  } catch (error) {
    return { error: safeError(error, 'Unable to start secure checkout') }
  }
}

export async function createBillingPortalImpl(): Promise<
  { url: string } | { error: string }
> {
  try {
    const account = await getAuthenticatedBillingUser()
    if (!account) return { error: 'Not authenticated' }

    const service = getSupabaseServiceClient()
    const { data, error } = await service
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('owner_id', account.user.id)
      .maybeSingle()
    if (error) throw error
    if (!data?.stripe_customer_id) {
      return { error: 'No Stripe billing account exists yet.' }
    }

    const portal = await getStripeClient().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${getBillingAppUrl()}/settings`,
    })
    return { url: portal.url }
  } catch (error) {
    return { error: safeError(error, 'Unable to open the billing portal') }
  }
}

function idFromExpandable(
  value: string | { id: string } | null,
  label: string,
): string {
  const id = typeof value === 'string' ? value : value?.id
  if (!id) throw new Error(`Stripe ${label} is missing`)
  return id
}

function unixTimestamp(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null
}

async function ownerForSubscription(
  subscription: Stripe.Subscription,
): Promise<string> {
  const metadataOwner = subscription.metadata.ownerId
  if (metadataOwner) return metadataOwner

  const customerId = idFromExpandable(subscription.customer, 'customer')
  const service = getSupabaseServiceClient()
  const { data, error } = await service
    .from('billing_customers')
    .select('owner_id')
    .eq('stripe_customer_id', customerId)
    .single()
  if (error || !data?.owner_id) {
    throw error ?? new Error('No owner is linked to this Stripe customer')
  }
  return data.owner_id
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  eventCreated: number,
): Promise<void> {
  if (!isStripeSubscriptionStatus(subscription.status)) {
    throw new Error(`Unsupported Stripe status: ${subscription.status}`)
  }

  const item = subscription.items.data[0]
  if (!item) throw new Error('Stripe subscription has no items')

  const ownerId = await ownerForSubscription(subscription)
  const customerId = idFromExpandable(subscription.customer, 'customer')
  const plan = planForStripePrice(item.price.id, subscription.metadata.plan)
  const service = getSupabaseServiceClient()
  const { error } = await service.rpc('sync_stripe_subscription', {
    p_owner_id: ownerId,
    p_customer_id: customerId,
    p_subscription_id: subscription.id,
    p_price_id: item.price.id,
    p_plan: plan,
    p_status: subscription.status,
    p_current_period_start: unixTimestamp(item.current_period_start),
    p_current_period_end: unixTimestamp(item.current_period_end),
    p_cancel_at_period_end: subscription.cancel_at_period_end,
    p_canceled_at: unixTimestamp(subscription.canceled_at),
    p_trial_end: unixTimestamp(subscription.trial_end),
    p_event_created: eventCreated,
  })
  if (error) throw error
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    // Stripe doesn't guarantee event delivery order. Retrieve the latest
    // object so even a delayed event converges to current provider state.
    const subscription = await getStripeClient().subscriptions.retrieve(
      event.data.object.id,
    )
    await syncSubscription(subscription, event.created)
    return
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    if (session.mode !== 'subscription' || !session.subscription) return
    const subscriptionId = idFromExpandable(
      session.subscription,
      'subscription',
    )
    const subscription = await getStripeClient().subscriptions.retrieve(
      subscriptionId,
    )
    await syncSubscription(subscription, event.created)
  }
}

export class InvalidStripeSignatureError extends Error {
  override name = 'InvalidStripeSignatureError'
}

export async function handleStripeWebhookImpl(
  rawBody: string,
  signature: string,
): Promise<void> {
  const stripe = getStripeClient()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    )
  } catch (error) {
    throw new InvalidStripeSignatureError('Invalid Stripe signature', {
      cause: error,
    })
  }
  const service = getSupabaseServiceClient()

  const { data: existing, error: lookupError } = await service
    .from('billing_webhook_events')
    .select('processed_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing?.processed_at) return

  const { error: recordError } = await service
    .from('billing_webhook_events')
    .upsert({
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_created_at: event.created,
      status: 'processing',
      error: null,
      processed_at: null,
    })
  if (recordError) throw recordError

  try {
    await processStripeEvent(event)
    const { error } = await service
      .from('billing_webhook_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id)
    if (error) throw error
  } catch (error) {
    await service
      .from('billing_webhook_events')
      .update({
        status: 'failed',
        error: (error instanceof Error ? error.message : String(error)).slice(
          0,
          500,
        ),
      })
      .eq('stripe_event_id', event.id)
    throw error
  }
}
