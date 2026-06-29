import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { KeyRow } from './key-row'

export const ApiTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Keys</CardTitle>
        <CardDescription>
          These keys are configured server-side and used for AI generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <KeyRow
          label="DeepSeek"
          description="Primary LLM for agent chat"
          status="configured"
        />
        <KeyRow
          label="OpenAI"
          description="Image generation (GPT-Image-1)"
          status="configured"
        />
        <p className="pt-2 text-xs text-muted-foreground">
          API keys are stored in <code className="rounded bg-muted px-1">.env</code>{' '}
          and never exposed to the client. Manage them in your deployment
          environment.
        </p>
      </CardContent>
    </Card>
  )
}
