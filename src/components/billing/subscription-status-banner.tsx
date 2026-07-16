import { format } from 'date-fns'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReactivateSubscription } from '@/hooks/use-subscriptions'
import type { SubscriptionRecord } from '@/lib/subscriptions'

export function SubscriptionStatusBanner({
  subscription,
}: {
  subscription: SubscriptionRecord
}) {
  const reactivate = useReactivateSubscription()

  const periodEnd = subscription.current_period_end
    ? format(new Date(subscription.current_period_end), 'MMM d, yyyy')
    : 'the end of your billing period'

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Your subscription ends on {periodEnd}
          </p>
          <p className="text-xs text-muted-foreground">
            You'll keep your current features until then, then move to the Free
            plan.
          </p>
        </div>
        {subscription.status === 'canceled_pending' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reactivate.mutate({})}
            disabled={reactivate.isPending}
          >
            <RotateCcw className="size-4" />
            Reactivate
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
