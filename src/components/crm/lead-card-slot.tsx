import { useState } from 'react'
import { Calendar, CalendarDays, Check, Plus, X } from 'lucide-react'
import { addDays, format, formatDistanceToNow, isToday, isPast, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useUpdateLead } from '@/hooks/use-crm'
import { cn } from '@/lib/utils'

const QUICK_DATES = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+7 days', days: 7 },
]

export const CardSlot = ({ leadId, lead }: { leadId: string; lead: { scheduled_date: string | null; name: string } }) => {
  const updateLead = useUpdateLead()
  const [customDate, setCustomDate] = useState('')

  const scheduled = lead.scheduled_date
  const hasSlot = !!scheduled
  const slotIsToday = scheduled ? isToday(parseISO(scheduled)) : false
  const slotIsPast = scheduled ? isPast(parseISO(scheduled)) && !isToday(parseISO(scheduled)) : false

  const placeCard = (daysFromNow: number) => {
    const date = addDays(new Date(), daysFromNow)
    updateLead.mutate({
      id: leadId,
      scheduled_date: format(date, 'yyyy-MM-dd'),
    })
  }

  const placeCustomDate = () => {
    if (!customDate) return
    updateLead.mutate({
      id: leadId,
      scheduled_date: customDate,
    })
    setCustomDate('')
  }

  const removeFromSlot = () => {
    updateLead.mutate({
      id: leadId,
      scheduled_date: null,
    })
  }

  return (
    <Card className={cn(hasSlot && 'border-primary/30')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="size-4" /> Card Slot
        </CardTitle>
        <CardDescription>
          Choose a date to pull this card from the box
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasSlot ? (
          <div className="space-y-3">
            <div
              className={cn(
                'rounded-lg border-2 p-3 text-center transition-colors',
                slotIsToday
                  ? 'border-primary bg-primary/5'
                  : slotIsPast
                    ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                    : 'border-muted bg-muted/30',
              )}
            >
              <p className="text-xs text-muted-foreground">Placed in slot</p>
              <p className={cn('mt-1 text-lg font-semibold', slotIsToday && 'text-primary')}>
                {scheduled && format(parseISO(scheduled), 'EEEE, MMM d, yyyy')}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {slotIsToday
                  ? 'Due today — time to work this card!'
                  : slotIsPast
                    ? 'Overdue — move it to a new date'
                    : formatDistanceToNow(parseISO(scheduled!), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Calendar className="size-3.5" /> Move
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick dates</p>
                    <div className="grid grid-cols-2 gap-1">
                      {QUICK_DATES.map((qd) => (
                        <Button
                          key={qd.label}
                          size="sm"
                          variant="ghost"
                          className="justify-start text-xs"
                          onClick={() => placeCard(qd.days)}
                        >
                          {qd.label}
                        </Button>
                      ))}
                    </div>
                    <div className="border-t pt-2">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Custom date</p>
                      <div className="flex gap-1">
                        <Input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={placeCustomDate}
                          disabled={!customDate}
                          className="h-8 shrink-0"
                        >
                          <Check className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                onClick={removeFromSlot}
              >
                <X className="size-3.5" /> Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 text-center">
              <CalendarDays className="mx-auto mb-1 size-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                This card is not in any date slot
              </p>
            </div>
            <p className="text-xs font-medium text-muted-foreground">Place in slot:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_DATES.map((qd) => (
                <Button
                  key={qd.label}
                  size="sm"
                  variant="outline"
                  onClick={() => placeCard(qd.days)}
                  className="text-xs"
                >
                  {qd.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-8 text-xs"
                placeholder="Pick a date"
              />
              <Button
                size="sm"
                onClick={placeCustomDate}
                disabled={!customDate}
                className="h-8 shrink-0"
              >
                <Plus className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
