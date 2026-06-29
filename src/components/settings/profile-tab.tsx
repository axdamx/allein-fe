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
import { useAgentTypes } from '@/hooks/use-agents'
import { updateProfile } from '@/server/settings'

import { AgentTypeField } from './agent-type-field'

export const ProfileTab = ({
  profile,
}: {
  profile: {
    full_name: string | null
    company: string | null
    phone: string | null
    email: string
    agent_type: string | null
    telegram_chat_id?: string | null
  }
}) => {
  const qc = useQueryClient()
  const { data: agentTypes } = useAgentTypes()
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [company, setCompany] = useState(profile.company ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')

  const agentTypeInfo = agentTypes?.find((t) => t.key === profile.agent_type)

  const mutation = useMutation({
    mutationFn: (data: {
      fullName?: string
      company?: string
      phone?: string
    }) => updateProfile({ data }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Profile updated')
        qc.invalidateQueries({ queryKey: ['profile'] })
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>Update your personal information.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ fullName, company, phone })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          {profile.agent_type && agentTypeInfo && (
            <AgentTypeField typeInfo={agentTypeInfo} />
          )}
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Your company"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
