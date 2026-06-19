import { MessageSquare } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { conversationSummary, conversations } from '@/data/mock'

export function ConversationsPanel() {
  return (
    <Card className="col-span-full xl:col-span-2">
      <CardHeader>
        <CardTitle>Recent Conversations</CardTitle>
        <CardDescription>Latest activity across your agents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {conversationSummary.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="rounded-lg border bg-muted/40 p-3"
              >
                <Icon className="size-4 text-muted-foreground" />
                <p className="mt-2 text-lg font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            )
          })}
        </div>
        <div className="divide-y">
          {conversations.map((c) => (
            <div key={c.id} className="flex items-start gap-3 py-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.agent}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {c.time}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {c.preview}
                </p>
              </div>
              {c.unread > 0 ? (
                <span className="ml-auto mt-0.5 rounded-full bg-primary px-1.5 text-[10px] font-medium text-primary-foreground">
                  {c.unread}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
