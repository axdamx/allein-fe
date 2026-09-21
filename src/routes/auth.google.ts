import { createFileRoute } from '@tanstack/react-router'

import { authRedirect, getAuthAppOrigin } from '@/lib/auth-url.server'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

export const Route = createFileRoute('/auth/google')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = getAuthAppOrigin(request)
        const supabase = getSupabaseServerClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) return authRedirect(`${origin}/dashboard`)

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${origin}/auth/callback`,
            skipBrowserRedirect: true,
          },
        })

        if (error || !data.url) {
          console.error('[google-auth] Could not start sign-in', error)
          return authRedirect(`${origin}/login?auth_error=google_unavailable`)
        }

        // The server client has set the PKCE code-verifier cookie. Supabase
        // will return to /auth/callback, where that verifier is exchanged.
        return authRedirect(data.url)
      },
    },
  },
})
