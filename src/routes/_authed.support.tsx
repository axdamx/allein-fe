import { Mail, MessageSquare, BookOpen, LifeBuoy } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardShell } from '@/components/layout/dashboard-shell'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authed/support')({
  component: SupportPage,
})

function SupportPage() {
  const { user } = Route.useRouteContext()

  return (
    <DashboardShell userEmail={user?.email} userName={user?.email?.split('@')[0]}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">
          Get help with your agents, account, or billing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Email us</CardTitle>
                <CardDescription>We'll get back within 24 hours</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Send us a detailed message about your issue and we'll respond as soon as possible.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="mailto:support@allein.ai">support@allein.ai</a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Live chat</CardTitle>
                <CardDescription>Chat with our support team</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Start a live chat session for immediate help during business hours.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Documentation</CardTitle>
                <CardDescription>Guides and API reference</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Browse our documentation for setup guides, best practices, and API references.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <LifeBuoy className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Account &amp; billing</CardTitle>
                <CardDescription>Plan changes and account issues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Having trouble with your plan, payments, or account settings? We're here to help.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="mailto:billing@allein.ai">billing@allein.ai</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
