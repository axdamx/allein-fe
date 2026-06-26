import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getClients,
  getClientsPaginated,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  type ClientRow,
  type CreateClientInput,
  type UpdateClientInput,
} from '@/server/clients'

export function useClients(): UseQueryResult<ClientRow[]>
export function useClients(
  page: number,
  pageSize: number,
  search?: string,
): UseQueryResult<{ data: ClientRow[]; total: number }>
export function useClients(page?: number, pageSize?: number, search?: string) {
  if (page === undefined || pageSize === undefined) {
    return useQuery({
      queryKey: ['crm', 'clients'],
      queryFn: () => getClients(),
      staleTime: 20 * 1000,
    })
  }
  return useQuery({
    queryKey: ['crm', 'clients', 'paginated', page, pageSize, search],
    queryFn: () => getClientsPaginated({ data: { page, pageSize, search } }),
    staleTime: 20 * 1000,
  })
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['crm', 'clients', id],
    queryFn: () => getClient({ data: { id: id! } }),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateClientInput) => createClient({ data: input }),
    onSuccess: (result) => {
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      toast.success('Client created')
      qc.invalidateQueries({ queryKey: ['crm', 'clients'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateClientInput) => updateClient({ data: input }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Client updated')
      qc.invalidateQueries({ queryKey: ['crm', 'clients'] })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteClient({ data: { id } }),
    onSuccess: (result) => {
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Client deleted')
      qc.invalidateQueries({ queryKey: ['crm', 'clients'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })
}

export type { ClientRow, CreateClientInput, UpdateClientInput }
