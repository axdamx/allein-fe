import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
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
import { cn } from '@/lib/utils'
import { updateProfile } from '@/server/settings'

export const IntegrationsTab = ({
  profile,
}: {
  profile: {
    telegram_chat_id?: string | null
    phone?: string | null
  }
}) => {
  const qc = useQueryClient()
  const [telegramChatId, setTelegramChatId] = useState(profile.telegram_chat_id ?? '')

  const mutation = useMutation({
    mutationFn: (data: { telegramChatId: string | null }) =>
      updateProfile({ data }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Integrations updated')
        qc.invalidateQueries({ queryKey: ['profile'] })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integrations</CardTitle>
        <CardDescription>
          Connect your messaging accounts to enable outbound and inbound
          communication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Telegram */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Telegram</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                profile.telegram_chat_id
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  profile.telegram_chat_id ? 'bg-emerald-500' : 'bg-muted-foreground',
                )}
              />
              {profile.telegram_chat_id ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Send a message to{' '}
            <code className="rounded bg-muted px-1">@your_bot</code> on Telegram,
            then enter your chat ID below.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
              <Input
                id="telegram-chat-id"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="123456789"
              />
            </div>
            <Button
              size="sm"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ telegramChatId: telegramChatId || null })}
            >
              {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">WhatsApp</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                profile.phone
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  profile.phone ? 'bg-emerald-500' : 'bg-muted-foreground',
                )}
              />
              {profile.phone ? 'Phone set' : 'No phone'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            WhatsApp messages are sent via Twilio. Inbound messages are routed
            based on your phone number in profile settings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
