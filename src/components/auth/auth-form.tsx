import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Brand } from '@/components/brand'
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

type Mode = 'login' | 'signup'

export function AuthForm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    // Mock auth: simulate a network round-trip, then navigate.
    setTimeout(() => {
      setSubmitting(false)
      toast.success(
        mode === 'login' ? 'Welcome back!' : 'Account created successfully',
      )
      navigate({ to: '/dashboard' })
    }, 600)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-b from-muted/50 to-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
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
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
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
                  <SubmitButton submitting={submitting} label="Create account" />
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          This is a mock flow — no real authentication.
        </p>
      </div>
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
      <Input id={id} required {...props} />
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
