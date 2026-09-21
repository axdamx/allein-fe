import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { loginFn, signupFn } from '@/server/auth'

type Mode = 'login' | 'signup'
type AuthError = 'google_cancelled' | 'google_unavailable' | 'google_failed'

const AUTH_ERRORS: Record<AuthError, string> = {
  google_cancelled: 'Google sign-in was cancelled. You can try again whenever you’re ready.',
  google_unavailable: 'Google sign-in is unavailable right now. Try again or use your email.',
  google_failed: 'We couldn’t complete Google sign-in. Please try again or use your email.',
}

export const AuthForm = ({ authError }: { authError?: AuthError }) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('login')
  const [googleLoading, setGoogleLoading] = useState(false)

  const loginMutation = useMutation({
    mutationFn: (vars: { data: { email: string; password: string } }) =>
      loginFn(vars),
    onSuccess: async (data) => {
      if (data?.error) {
        toast.error(data.message)
        return
      }
      toast.success('Welcome back!')
      await router.invalidate()
      queryClient.clear()
      router.navigate({ to: '/dashboard' })
    },
    onError: () => toast.error('Could not sign in. Please try again.'),
  })

  const signupMutation = useMutation({
    mutationFn: (vars: {
      data: { email: string; password: string; name?: string }
    }) => signupFn(vars),
    onSuccess: async (data) => {
      if (data?.error) {
        toast.error(data.message)
        return
      }
      // Use the server's message — it reflects whether email confirmation is
      // required (Supabase setting) or a session was created immediately.
      toast.success(data?.message ?? 'Account created.')
      if (data?.requiresEmailConfirmation) {
        setMode('login')
        return
      }
      await router.invalidate()
      queryClient.clear()
      router.navigate({ to: '/dashboard' })
    },
    onError: () => toast.error('Could not create your account. Please try again.'),
  })

  const submitting =
    mode === 'login'
      ? loginMutation.status === 'pending'
      : signupMutation.status === 'pending'

  return (
    <div className="w-full max-w-sm">
      <Card className="border-border/70 shadow-xl shadow-slate-950/5 dark:shadow-black/20">
        <CardHeader className="space-y-2 pb-5 text-center">
          <CardTitle className="text-2xl tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Your workspace is ready when you are.'
              : 'Build your workspace in just a few steps.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {authError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-foreground"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>{AUTH_ERRORS[authError]}</span>
            </div>
          ) : null}

          <a
            href="/auth/google"
            aria-disabled={googleLoading || submitting}
            onClick={(event) => {
              if (googleLoading || submitting) {
                event.preventDefault()
                return
              }
              setGoogleLoading(true)
            }}
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {googleLoading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
            {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
          </a>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">or use your email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as Mode)}
            className="w-full"
          >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    loginMutation.mutate({
                      data: {
                        email: formData.get('email') as string,
                        password: formData.get('password') as string,
                      },
                    })
                  }}
                  className="space-y-4 pt-3"
                >
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <Field
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <SubmitButton submitting={submitting} label="Sign in" />
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    signupMutation.mutate({
                      data: {
                        email: formData.get('email') as string,
                        password: formData.get('password') as string,
                        name: formData.get('name') as string,
                      },
                    })
                  }}
                  className="space-y-4 pt-3"
                >
                  <Field
                    id="name"
                    label="Full name"
                    type="text"
                    placeholder="Sam Hari"
                    autoComplete="name"
                  />
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  <Field
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <SubmitButton
                    submitting={submitting}
                    label="Create account"
                  />
                </form>
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <a href="/pricing" className="underline-offset-4 hover:underline">
          View plans &amp; pricing
        </a>
      </p>
    </div>
  )
}

const Field = ({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {/* `name` must be set for FormData.get() to retrieve the value.
        Default it to the same value as `id` unless overridden. */}
    <Input id={id} name={id} required {...props} />
  </div>
)

const SubmitButton = ({
  submitting,
  label,
}: {
  submitting: boolean
  label: string
}) => (
  <Button type="submit" className="w-full" disabled={submitting}>
    {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
    {label}
  </Button>
)

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
    <path fill="#4285F4" d="M21.35 12.25c0-.7-.06-1.37-.18-2.02H12v3.82h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.16c1.84-1.69 2.9-4.18 2.9-7.19Z" />
    <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.31l-3.16-2.45c-.87.58-1.98.92-3.29.92a5.8 5.8 0 0 1-5.44-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.75Z" />
    <path fill="#FBBC05" d="M6.56 13.88a5.86 5.86 0 0 1 0-3.76V7.6H3.3a9.75 9.75 0 0 0 0 8.8l3.26-2.52Z" />
    <path fill="#EA4335" d="M12 6.09c1.44 0 2.73.5 3.74 1.46l2.81-2.81A9.3 9.3 0 0 0 12 2.25a9.75 9.75 0 0 0-8.7 5.35l3.26 2.52A5.8 5.8 0 0 1 12 6.09Z" />
  </svg>
)
