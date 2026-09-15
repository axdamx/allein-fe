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
          label="Z.AI"
          description="GLM-4.5-Flash for agent chat and text generation"
          status="configured"
        />
        <KeyRow
          label="Z.AI Media"
          description="CogView-4 images and CogVideoX-3 video"
          status="configured"
        />
        <KeyRow
          label="Local embeddings"
          description="MiniLM-L6-v2 knowledge-base retrieval"
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
