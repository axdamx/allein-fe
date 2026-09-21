/** The canonical app origin used for OAuth redirects. Never trust a `next` URL from the browser. */
export function getAuthAppOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim()
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('APP_URL is required for Google sign-in in production')
  }

  const url = new URL(configured || request.url)
  const localHttp =
    url.protocol === 'http:' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('Google sign-in requires HTTPS outside localhost')
  }

  return url.origin
}

/** Keep redirect headers mutable for TanStack Start's security middleware. */
export function authRedirect(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: location },
  })
}
