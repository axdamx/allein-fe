import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PLAN_CONFIGS } from '@/lib/plans'
import { useCancelSubscription } from '@/hooks/use-subscriptions'
import type { PlanTier } from '@/lib/plans'

const REASONS = [
  'Too expensive',
  'Not enough features',
  'Switching to alternative',
  'Other',
] as const

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  currentPlan,
  currentPeriodEnd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: PlanTier
  currentPeriodEnd: string | null
}) {
  const [reason, setReason] = useState<string>('')
  const [immediate, setImmediate] = useState(false)
  const cancel = useCancelSubscription()

  const periodEndLabel = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), 'MMM d, yyyy')
    : 'the end of your billing period'

  function handleConfirm() {
    cancel.mutate(
      { immediate, reason: reason || undefined },
      {
        onSuccess: (result) => {
          if (!result?.error) onOpenChange(false)
        },
      },
    )
  }

  const planLabel = PLAN_CONFIGS[currentPlan]?.label ?? 'your'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel your {planLabel} subscription</DialogTitle>
          <DialogDescription>
            {immediate
              ? 'Your access will end immediately and your account will move to the Free plan.'
              : `You'll keep your ${planLabel} features until ${periodEndLabel}, then your account will move to the Free plan.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="cancel-reason"
              className="text-xs text-muted-foreground"
            >
              Reason (optional)
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="cancel-immediate" className="text-sm font-medium">
                Cancel now instead
              </Label>
              <p className="text-xs text-muted-foreground">
                End access immediately instead of waiting until{' '}
                {periodEndLabel}.
              </p>
            </div>
            <Switch
              id="cancel-immediate"
              checked={immediate}
              onCheckedChange={setImmediate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep my plan
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancel.isPending}
          >
            {cancel.isPending ? 'Canceling…' : 'Confirm cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
