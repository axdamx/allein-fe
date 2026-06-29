import { useState, useEffect } from 'react'
import {
  Building2,
  Calendar,
  CalendarDays,
  Check,
  DollarSign,
  Edit3,
  Mail,
  Phone,
  Tag,
  X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useUpdateLead } from '@/hooks/use-crm'
import type { LeadSourceType } from '@/server/crm'
import { InfoRow } from '@/components/crm/lead-info-row'
import { InlineField } from '@/components/crm/lead-inline-field'

const SOURCE_OPTIONS: { value: LeadSourceType; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
]

export const EditableContactCard = ({ lead }: { lead: { id: string; name: string; email: string | null; phone: string | null; company: string | null; source: string; value: number; tags: string[]; scheduled_date: string | null } }) => {
  const updateLead = useUpdateLead()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(lead.name)
  const [email, setEmail] = useState(lead.email ?? '')
  const [phone, setPhone] = useState(lead.phone ?? '')
  const [company, setCompany] = useState(lead.company ?? '')
  const [source, setSource] = useState(lead.source)
  const [value, setValue] = useState(String(lead.value || ''))

  useEffect(() => {
    setName(lead.name)
    setEmail(lead.email ?? '')
    setPhone(lead.phone ?? '')
    setCompany(lead.company ?? '')
    setSource(lead.source)
    setValue(String(lead.value || ''))
  }, [lead])

  const handleSave = () => {
    updateLead.mutate({
      id: lead.id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      source: source as LeadSourceType,
      value: Number(value) || 0,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setName(lead.name)
    setEmail(lead.email ?? '')
    setPhone(lead.phone ?? '')
    setCompany(lead.company ?? '')
    setSource(lead.source)
    setValue(String(lead.value || ''))
    setEditing(false)
  }

  if (editing) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contact information</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="size-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineField label="Name" icon={<Edit3 className="size-4" />}>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Email" icon={<Mail className="size-4" />}>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Phone" icon={<Phone className="size-4" />}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Company" icon={<Building2 className="size-4" />}>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} className="h-8 text-sm" />
            </InlineField>
            <InlineField label="Source" icon={<Calendar className="size-4" />}>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </InlineField>
            <InlineField label="Deal value" icon={<DollarSign className="size-4" />}>
              <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-sm" type="number" />
            </InlineField>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contact information</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Edit3 className="size-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={<Edit3 className="size-4" />} label="Name" value={lead.name} />
          <InfoRow icon={<Mail className="size-4" />} label="Email" value={lead.email} />
          <InfoRow icon={<Phone className="size-4" />} label="Phone" value={lead.phone} />
          <InfoRow icon={<Building2 className="size-4" />} label="Company" value={lead.company} />
          <InfoRow icon={<Calendar className="size-4" />} label="Source" value={lead.source} capitalize />
          <InfoRow icon={<DollarSign className="size-4" />} label="Deal value" value={lead.value > 0 ? `$${Number(lead.value).toLocaleString()}` : null} />
          {lead.scheduled_date && (
            <div className="col-span-full">
              <InfoRow
                icon={<CalendarDays className="size-4" />}
                label="Scheduled"
                value={format(parseISO(lead.scheduled_date), 'MMM d, yyyy')}
              />
            </div>
          )}
          {lead.tags && lead.tags.length > 0 && (
            <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="size-4 shrink-0" />
              <span className="flex flex-wrap gap-1">
                {lead.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
