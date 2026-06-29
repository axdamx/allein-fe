import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  importCalendarEvents,
  getCalendarEvents,
  deleteCalendarEvent,
  type CalendarEventRow,
} from '@/server/planner'

export const useCalendarEvents = () => {
  return useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => getCalendarEvents(),
    staleTime: 10 * 1000,
  })
}

export const useImportCalendarEvents = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (icsContent: string) => importCalendarEvents({ data: { icsContent } }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success(`Imported ${result.count} event${result.count === 1 ? '' : 's'}`)
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to import calendar events'
      toast.error(msg)
    },
  })
}

export const useDeleteCalendarEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCalendarEvent({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Event deleted')
      qc.invalidateQueries({ queryKey: ['calendar-events'] })
    },
  })
}

export type { CalendarEventRow }
