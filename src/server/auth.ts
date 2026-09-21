import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'
import { rateLimit } from '@/server/_rate-limit'

export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    // Rate limit by IP to slow brute-force / credential-stuffing.
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    const rl = rateLimit(`login:${ip}`, { windowMs: 60_000, max: 10 })
    if (!rl.allowed) {
      return {
        error: true,
        message: 'Too many login attempts. Please try again later.',
      }
    }

    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: true, message: 'Invalid email or password' }
    }
  })

export const signupFn = createServerFn({ method: 'POST' })
  .validator(
    (d: { email: string; password: string; name?: string }) => d,
  )
  .handler(async ({ data }) => {
    // Rate limit signup harder — account creation is a common abuse vector.
    const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    const rl = rateLimit(`signup:${ip}`, { windowMs: 60_000, max: 5 })
    if (!rl.allowed) {
      return {
        error: true,
        message: 'Too many sign-up attempts. Please try again later.',
      }
    }

    const supabase = getSupabaseServerClient()
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: data.name ? { data: { full_name: data.name } } : undefined,
    })

    if (error) {
      return { error: true, message: error.message }
    }

    // If no session came back, email confirmation is still enabled in
    // Supabase — prompt the user to confirm before signing in.
    if (!result.session) {
      return {
        error: false,
        message:
          'Account created — check your email to confirm, then sign in.',
        requiresEmailConfirmation: true,
      }
    }

    return { error: false, message: 'Account created', requiresEmailConfirmation: false }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: true, message: error.message }
  }

  return { error: false, message: 'Signed out' }
})
