import { createFileRoute } from '@tanstack/react-router'

import {
  handleStripeWebhookImpl,
  InvalidStripeSignatureError,
} from '@/server/billing.server'

export const Route = createFileRoute('/api/billing/stripe-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get('stripe-signature')
        if (!signature) {
          return new Response('Missing Stripe signature', { status: 400 })
        }

        // Stripe signs the exact bytes it sends. Parsing and re-serializing the
        // body before verification would invalidate that signature.
        const rawBody = await request.text()
        try {
          await handleStripeWebhookImpl(rawBody, signature)
          return new Response('ok', { status: 200 })
        } catch (error) {
          console.error('[stripe-webhook] processing failed', error)
          const invalidSignature = error instanceof InvalidStripeSignatureError
          return new Response(
            invalidSignature
              ? 'Invalid Stripe signature'
              : 'Webhook processing failed',
            { status: invalidSignature ? 400 : 500 },
          )
        }
      },
    },
  },
})
