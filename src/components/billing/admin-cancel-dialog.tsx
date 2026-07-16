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
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useAdminCancelSubscription } from '@/hooks/use-subscriptions'
import { PLAN_CONFIGS } from '@/lib/plans'
import type { PlanTier } from '@/lib/plans'

export function AdminCancelDialog({
  open,
  onOpenChange,
  user,
  currentPlan,
  currentPeriodEnd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; email: string }
  currentPlan: PlanTier
  currentPeriodEnd: string | null
}) {
  const [reason, setReason] = useState('')
  const [immediate, setImmediate] = useState(false)
  const cancel = useAdminCancelSubscription()

  const periodEndLabel = currentPeriodEnd
    ? format(new Date(currentPeriodEnd), 'MMM d, yyyy')
    : 'the end of the billing period'

  const reasonInvalid = reason.trim().length < 3

  function handleConfirm() {
    if (reasonInvalid) return
    cancel.mutate(
      { targetUserId: user.id, immediate, reason: reason.trim() },
      {
        onSuccess: (result) => {
          if (!result?.error) onOpenChange(false)
        },
      },
    )
  }

  const planLabel = PLAN_CONFIGS[currentPlan]?.label ?? 'current'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel subscription for {user.email}</DialogTitle>
          <DialogDescription>
            Currently on the {planLabel} plan. This action is logged with your
            admin identity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="admin-cancel-reason"
              className="text-xs text-muted-foreground"
            >
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="admin-cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this subscription being canceled?"
              rows={3}
            />
            {reason.length > 0 && reasonInvalid && (
              <p className="text-xs text-destructive">
                Reason must be at least 3 characters.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Timing</Label>
            <RadioGroup
              value={immediate ? 'immediate' : 'period_end'}
              onValueChange={(v) => setImmediate(v === 'immediate')}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="period_end" id="t-period" />
                <Label htmlFor="t-period" className="text-sm font-normal">
                  At period end ({periodEndLabel})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="immediate" id="t-immediate" />
                <Label htmlFor="t-immediate" className="text-sm font-normal">
                  Immediately — drop to Free now
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancel.isPending || reasonInvalid}
          >
            {cancel.isPending ? 'Canceling…' : 'Confirm cancellation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
