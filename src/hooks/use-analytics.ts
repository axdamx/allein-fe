import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsTrends,
  type AnalyticsTrends,
} from '@/server/analytics'

export function useAnalyticsTrends() {
  return useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => getAnalyticsTrends(),
    staleTime: 60 * 1000,
  })
}

export type { AnalyticsTrends }
