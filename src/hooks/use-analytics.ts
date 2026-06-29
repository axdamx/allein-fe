import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsTrends,
  type AnalyticsTrends,
} from '@/server/analytics'

export const useAnalyticsTrends = () => {
  return useQuery({
    queryKey: ['analytics-trends'],
    queryFn: () => getAnalyticsTrends(),
    staleTime: 60 * 1000,
  })
}

export type { AnalyticsTrends }
