import { useState } from 'react'
import { Loader2 } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import { useCreateClient, useUpdateClient } from '@/hooks/use-clients'
import type { ClientRow, ClientStatus } from '@/server/clients'
import { CLIENT_STATUSES } from '@/server/clients'

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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientRow | null
}

export function ClientFormDialog({ open, onOpenChange, client }: Props) {
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const isEditing = !!client

  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [website, setWebsite] = useState(client?.website ?? '')
  const [industry, setIndustry] = useState(client?.industry ?? '')
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'active')
  const [notes, setNotes] = useState(client?.notes ?? '')

  function reset() {
    setName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setWebsite('')
    setIndustry('')
    setStatus('active')
    setNotes('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      company: company || undefined,
      website: website || undefined,
      industry: industry || undefined,
      status,
      notes: notes || undefined,
    }

    if (isEditing && client) {
      updateClient.mutate(
        { id: client.id, ...payload },
        {
          onSuccess: (result) => {
            if (!result?.error) {
              onOpenChange(false)
            }
          },
        },
      )
    } else {
      createClient.mutate(payload, {
        onSuccess: (result) => {
          if (!('error' in result)) {
            reset()
            onOpenChange(false)
          }
        },
      })
    }
  }

  const isPending = createClient.isPending || updateClient.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit client' : 'New client'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this client\'s information.'
              : 'Add a new client to your database.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Name *</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-company">Company</Label>
              <Input
                id="client-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-industry">Industry</Label>
              <Select
                value={industry}
                onValueChange={(v) => setIndustry(v)}
              >
                <SelectTrigger id="client-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="client-website">Website</Label>
              <Input
                id="client-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ClientStatus)}
              >
                <SelectTrigger id="client-status">
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
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea
              id="client-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isEditing ? 'Save changes' : 'Add client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
