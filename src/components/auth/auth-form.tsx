import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
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

export function AuthForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('login')

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
      toast.success('Account created! Check your email to verify.')
      await router.invalidate()
      queryClient.clear()
      router.navigate({ to: '/dashboard' })
    },
  })

  const submitting =
    mode === 'login'
      ? loginMutation.status === 'pending'
      : signupMutation.status === 'pending'

  return (
    <div className="w-full max-w-sm">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Sign in to your Allein workspace'
              : 'Start building with AI agents in minutes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  className="space-y-4 pt-2"
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
                  className="space-y-4 pt-2"
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
          <a
            href="/pricing"
            className="underline-offset-4 hover:underline"
          >
            View plans &amp; pricing
          </a>
        </p>
      </div>
  )
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {/* `name` must be set for FormData.get() to retrieve the value.
          Default it to the same value as `id` unless overridden. */}
      <Input id={id} name={id} required {...props} />
    </div>
  )
}

function SubmitButton({
  submitting,
  label,
}: {
  submitting: boolean
  label: string
}) {
  return (
    <Button type="submit" className="w-full" disabled={submitting}>
      {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  )
}
