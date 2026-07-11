import crypto from 'node:crypto'

/**
 * Verify the Telegram webhook secret token.
 *
 * When a webhook is registered with a `secret_token`, Telegram sends it back in
 * the `X-Telegram-Bot-Api-Secret-Token` header on every update. We compare
 * against the configured secret in constant time to prevent timing attacks.
 *
 * If no secret is configured we FAIL CLOSED (reject the request) rather than
 * silently accepting unverified traffic — see migration note in .env.example.
 */
export function verifyTelegramWebhook(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return false

  const received = request.headers.get('x-telegram-bot-api-secret-token')
  if (!received) return false

  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Verify the Twilio request signature for a webhook.
 *
 * Twilio signs each request with an HMAC-SHA1 over the full URL + sorted form
 * params, using the auth token as the key. The signature is sent in the
 * `X-Twilio-Signature` header (base64).
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Note: the URL must be the EXACT URL Twilio called (including https and any
 * proxy port). We build it from the Host header + x-forwarded-proto so it works
 * behind Vercel/proxies.
 */
export async function verifyTwilioWebhook(
  request: Request,
  rawBody: string,
): Promise<boolean> {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return false

  const signature = request.headers.get('x-twilio-signature')
  if (!signature) return false

  const url = resolveTwilioUrl(request)

  // Twilio sorts params alphabetically by key and concatenates key+value.
  // We receive the raw form body; rebuild the canonical string.
  const params = new URLSearchParams(rawBody)
  const sortedKeys = [...params.keys()].sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + (params.get(key) ?? '')
  }

  const computed = crypto
    .createHmac('sha1', authToken)
    .update(data, 'utf8')
    .digest('base64')

  const a = Buffer.from(signature)
  const b = Buffer.from(computed)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

/**
 * Resolve the URL Twilio called. Behind a reverse proxy the request.url may be
 * a relative path; reconstruct from forwarded headers so the signature matches.
 */
function resolveTwilioUrl(request: Request): string {
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) {
    return `${forwardedProto}://${host}${new URL(request.url).pathname}`
  }
  // Fallback: trust the request URL
  return request.url
}
