import { useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, TrendingUp } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useDeals, useUpdateDealStage } from '@/hooks/use-crm'
import { DEAL_STAGES } from '@/server/crm'
import type { DealRow, DealStage } from '@/server/crm'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/crm/pipeline')({
  component: PipelinePage,
})

function PipelinePage() {
  const { data: deals, isLoading } = useDeals()

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map = new Map<DealStage, DealRow[]>()
    for (const stage of DEAL_STAGES.map((s) => s.value)) {
      map.set(stage, [])
    }
    for (const deal of deals ?? []) {
      map.get(deal.stage)?.push(deal)
    }
    return map
  }, [deals])

  const totalValue = (deals ?? [])
    .filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
    .reduce((sum, d) => sum + Number(d.value), 0)

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {deals?.length ?? 0} deals ·{' '}
            <span className="font-medium text-foreground">
              ${totalValue.toLocaleString()}
            </span>{' '}
            open
          </p>
        </div>
        <Button disabled>
          <Plus className="size-4" /> New Deal
        </Button>
      </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {DEAL_STAGES.map((s) => (
              <div key={s.value} className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = dealsByStage.get(stage.value) ?? []
              const stageValue = stageDeals.reduce(
                (sum, d) => sum + Number(d.value),
                0,
              )
              return (
                <div key={stage.value} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-sm font-medium">
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="px-1 text-xs text-muted-foreground">
                    ${stageValue.toLocaleString()}
                  </p>
                  <div className="flex flex-col gap-2">
                    {stageDeals.map((deal) => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                        No deals
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </>
  )
}

function DealCard({ deal }: { deal: DealRow }) {
  const updateStage = useUpdateDealStage()
  const stageInfo = DEAL_STAGES.find((s) => s.value === deal.stage)

  return (
    <Card className="cursor-default">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{deal.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <TrendingUp className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled className="text-xs">
                Move to:
              </DropdownMenuItem>
              {DEAL_STAGES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  disabled={s.value === deal.stage}
                  onClick={() =>
                    updateStage.mutate({ dealId: deal.id, stage: s.value })
                  }
                >
                  <span
                    className="mr-1.5 size-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-semibold">
            ${Number(deal.value).toLocaleString()}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              stageInfo && 'text-muted-foreground',
            )}
          >
            {deal.probability}%
          </span>
        </div>
        {deal.expected_close_date && (
          <p className="mt-1 text-xs text-muted-foreground">
            Close: {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
