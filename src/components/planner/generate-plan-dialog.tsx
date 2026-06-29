import { useState } from 'react'
import { Loader2, WandSparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useGeneratePlan } from '@/hooks/use-planner'
import type { TimeFrame } from '@/hooks/use-planner'

export const GeneratePlanDialog = ({ timeFrame }: { timeFrame: TimeFrame }) => {
  const [open, setOpen] = useState(false)
  const generate = useGeneratePlan()
  const [prompt, setPrompt] = useState('')

  const suggestions: Record<TimeFrame, string[]> = {
    day: [
      'Review leads and follow up with top 3 prospects',
      'Check agent performance and adjust prompts',
      'Create content for today\'s social media post',
    ],
    week: [
      'Plan weekly lead generation outreach campaign',
      'Schedule content calendar for the week',
      'Review pipeline and move deals forward',
    ],
    month: [
      'Monthly strategy: review KPIs and set targets',
      'Plan content calendar and campaign for the month',
      'Audit agent performance and optimize configurations',
    ],
    quarter: [
      'Q2 growth strategy: expand lead gen channels',
      'Quarterly review of all agent metrics',
      'Plan product launch campaign for next quarter',
    ],
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    generate.mutate(
      { prompt: prompt.trim(), timeFrame },
      { onSuccess: () => { setOpen(false); setPrompt('') } },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <WandSparkles className="size-4" /> Generate Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Generate {timeFrame} plan</DialogTitle>
            <DialogDescription>
              Describe what you want to accomplish and AI will break it into tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label htmlFor="prompt">What do you want to achieve?</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`e.g. "Generate leads through LinkedIn outreach this ${timeFrame}"`}
                rows={3}
                autoFocus
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions[timeFrame].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                    className="rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!prompt.trim() || generate.isPending}>
              {generate.isPending && <Loader2 className="size-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
