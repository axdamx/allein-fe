import { ArrowRight, CalendarDays, Check } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { isPast, parseISO } from 'date-fns'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTodaysLeads, useUpdateLead } from '@/hooks/use-crm'
import { motion } from '@/lib/animations'
import { cn } from '@/lib/utils'

export const TodaysBox = () => {
  const { data: todaysLeads, isLoading } = useTodaysLeads()
  const updateLead = useUpdateLead()

  if (isLoading) {
    return (
      <div className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!todaysLeads || todaysLeads.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
      className="mt-4"
    >
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" />
              Today's Box
            </CardTitle>
            <CardDescription>
              {todaysLeads.length} card{todaysLeads.length === 1 ? '' : 's'} in today's slot
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/crm/leads">
              View all <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="space-y-1">
            {todaysLeads.slice(0, 5).map((lead) => {
              const isOverdue = lead.scheduled_date && isPast(parseISO(lead.scheduled_date)) && lead.scheduled_date !== new Date().toISOString().split('T')[0]
              return (
                <div
                  key={lead.id}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50',
                    isOverdue && 'border-l-2 border-red-400 pl-[6px]',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Link
                      to="/crm/leads/$leadId"
                      params={{ leadId: lead.id }}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {lead.company && `· ${lead.company}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {lead.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        updateLead.mutate({
                          id: lead.id,
                          scheduled_date: null,
                        })
                      }
                    >
                      <Check className="size-3" /> Done
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
