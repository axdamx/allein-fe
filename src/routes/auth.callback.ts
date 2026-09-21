import { createFileRoute } from '@tanstack/react-router'

import { authRedirect, getAuthAppOrigin } from '@/lib/auth-url.server'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = getAuthAppOrigin(request)
        const params = new URL(request.url).searchParams

        if (params.has('error')) {
          const reason =
            params.get('error') === 'access_denied'
              ? 'google_cancelled'
              : 'google_failed'
          return authRedirect(`${origin}/login?auth_error=${reason}`)
        }

        const code = params.get('code')
        if (!code) {
          return authRedirect(`${origin}/login?auth_error=google_failed`)
        }

        const supabase = getSupabaseServerClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('[google-auth] Code exchange failed', error)
          return authRedirect(`${origin}/login?auth_error=google_failed`)
        }

        return authRedirect(`${origin}/dashboard`)
      },
    },
  },
})
