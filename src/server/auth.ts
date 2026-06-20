import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '@/lib/supabase/server.server'

export const loginFn = createServerFn({ method: 'POST' })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return { error: true, message: error.message }
    }
  })

export const signupFn = createServerFn({ method: 'POST' })
  .validator(
    (d: { email: string; password: string; name?: string }) => d,
  )
  .handler(async ({ data }) => {
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
      }
    }

    return { error: false, message: 'Account created' }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: true, message: error.message }
  }

  return { error: false, message: 'Signed out' }
})
