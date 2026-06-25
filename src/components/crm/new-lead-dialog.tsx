import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { CalendarDays, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateLead } from '@/hooks/use-crm'
import type { LeadSourceType } from '@/server/crm'
import { cn } from '@/lib/utils'

const SOURCES: { value: LeadSourceType; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'social', label: 'Social' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
]

const QUICK_DATES = [
  { label: 'None', value: null },
  { label: 'Today', value: addDays(new Date(), 0) },
  { label: 'Tomorrow', value: addDays(new Date(), 1) },
  { label: '+3 days', value: addDays(new Date(), 3) },
  { label: '+7 days', value: addDays(new Date(), 7) },
]

export function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createLead = useCreateLead()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [source, setSource] = useState<LeadSourceType>('website')
  const [value, setValue] = useState('')
  const [scheduledDate, setScheduledDate] = useState<string | null>(null)
  const [customDate, setCustomDate] = useState('')

  function reset() {
    setName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setSource('website')
    setValue('')
    setScheduledDate(null)
    setCustomDate('')
  }

  function selectQuickDate(date: Date | null) {
    if (date) {
      setScheduledDate(format(date, 'yyyy-MM-dd'))
    } else {
      setScheduledDate(null)
    }
    setCustomDate('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    createLead.mutate(
      {
        name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        source,
        value: value ? Number(value) : 0,
        scheduled_date: scheduledDate || undefined,
      },
      {
        onSuccess: (result) => {
          if (!('error' in result)) {
            reset()
            onOpenChange(false)
          }
        },
      },
    )
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const isScheduledToday = scheduledDate === todayStr

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
          <DialogDescription>
            Add a prospect to your CRM manually.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Name *</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lead-email">Email</Label>
              <Input
                id="lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input
                id="lead-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="lead-company">Company</Label>
              <Input
                id="lead-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-source">Source</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as LeadSourceType)}
              >
                <SelectTrigger id="lead-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lead-value">Deal value (USD)</Label>
            <Input
              id="lead-value"
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              Place in date slot (optional)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DATES.map((qd) => (
                <button
                  key={qd.label}
                  type="button"
                  onClick={() => selectQuickDate(qd.value)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                    (qd.value === null && scheduledDate === null)
                      ? 'border-primary bg-primary/10 text-primary'
                      : qd.value && scheduledDate === format(qd.value, 'yyyy-MM-dd')
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input text-muted-foreground hover:bg-muted',
                  )}
                >
                  {qd.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value)
                  setScheduledDate(e.target.value || null)
                }}
                className="h-8 text-xs"
                placeholder="Pick custom date"
              />
            </div>
            {isScheduledToday && (
              <p className="text-xs text-primary">Will appear in today's box</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
