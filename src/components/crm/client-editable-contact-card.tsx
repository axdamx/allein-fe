import { useState, useEffect } from 'react'
import {
  Building2,
  Check,
  Edit3,
  Globe,
  Mail,
  Phone,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateClient } from '@/hooks/use-clients'
import type { ClientRow, ClientStatus } from '@/server/clients'
import { CLIENT_STATUSES } from '@/server/clients'
import { InfoRow } from '@/components/crm/client-info-row'
import { InlineField } from '@/components/crm/client-inline-field'

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Real Estate',
  'Media',
  'Consulting',
  'Other',
]

export const EditableContactCard = ({ client }: { client: ClientRow }) => {
  const updateClient = useUpdateClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(client.name)
  const [email, setEmail] = useState(client.email ?? '')
  const [phone, setPhone] = useState(client.phone ?? '')
  const [company, setCompany] = useState(client.company ?? '')
  const [website, setWebsite] = useState(client.website ?? '')
  const [industry, setIndustry] = useState(client.industry ?? '')
  const [status, setStatus] = useState(client.status)
  const [dateOfBirth, setDateOfBirth] = useState(client.date_of_birth ?? '')

  useEffect(() => {
    setName(client.name)
    setEmail(client.email ?? '')
    setPhone(client.phone ?? '')
    setCompany(client.company ?? '')
    setWebsite(client.website ?? '')
    setIndustry(client.industry ?? '')
    setStatus(client.status)
    setDateOfBirth(client.date_of_birth ?? '')
  }, [client])

  const handleSave = () => {
    updateClient.mutate({
      id: client.id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      website: website || undefined,
      industry: industry || undefined,
      status,
      date_of_birth: dateOfBirth || undefined,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setName(client.name)
    setEmail(client.email ?? '')
    setPhone(client.phone ?? '')
    setCompany(client.company ?? '')
    setWebsite(client.website ?? '')
    setIndustry(client.industry ?? '')
    setStatus(client.status)
    setDateOfBirth(client.date_of_birth ?? '')
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
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Email" icon={<Mail className="size-4" />}>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Phone" icon={<Phone className="size-4" />}>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Company" icon={<Building2 className="size-4" />}>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Website" icon={<Globe className="size-4" />}>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="h-8 text-sm"
              />
            </InlineField>
            <InlineField label="Industry" icon={<Building2 className="size-4" />}>
              <Select value={industry} onValueChange={(v) => setIndustry(v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InlineField>
            <InlineField label="Status" icon={<Edit3 className="size-4" />}>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ClientStatus)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InlineField>
            <InlineField label="Date of Birth" icon={<Edit3 className="size-4" />}>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-8 text-sm"
              />
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
          <InfoRow
            icon={<Edit3 className="size-4" />}
            label="Name"
            value={client.name}
          />
          <InfoRow
            icon={<Mail className="size-4" />}
            label="Email"
            value={client.email}
          />
          <InfoRow
            icon={<Phone className="size-4" />}
            label="Phone"
            value={client.phone}
          />
          <InfoRow
            icon={<Building2 className="size-4" />}
            label="Company"
            value={client.company}
          />
          <InfoRow
            icon={<Globe className="size-4" />}
            label="Website"
            value={client.website}
          />
          <InfoRow
            icon={<Building2 className="size-4" />}
            label="Industry"
            value={client.industry}
          />
          <InfoRow
            icon={<Edit3 className="size-4" />}
            label="Status"
            value={client.status}
            capitalize
          />
          <InfoRow
            icon={<Edit3 className="size-4" />}
            label="Date of Birth"
            value={client.date_of_birth ? format(new Date(client.date_of_birth), 'MMM d, yyyy') : null}
          />
        </div>
      </CardContent>
    </Card>
  )
}
