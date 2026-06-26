/**
 * Public server functions for the Clients module.
 */
import { createServerFn } from '@tanstack/react-start'

import type { CreateClientInput, UpdateClientInput, ClientStatus } from '@/server/clients.server'

export type { ClientRow, ClientStatus, CreateClientInput, UpdateClientInput } from '@/server/clients.server'

export const getClients = createServerFn({ method: 'GET' }).handler(async () => {
  const { getClientsImpl } = await import('./clients.server')
  return getClientsImpl()
})

export const getClientsPaginated = createServerFn({ method: 'GET' })
  .validator((d: { page: number; pageSize: number; search?: string }) => d)
  .handler(async ({ data }) => {
    const { getClientsPaginatedImpl } = await import('./clients.server')
    return getClientsPaginatedImpl(data)
  })

export const getClient = createServerFn({ method: 'GET' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { getClientByIdImpl } = await import('./clients.server')
    return getClientByIdImpl(data.id)
  })

export const createClient = createServerFn({ method: 'POST' })
  .validator((d: CreateClientInput) => d)
  .handler(async ({ data }) => {
    const { createClientImpl } = await import('./clients.server')
    return createClientImpl(data)
  })

export const updateClient = createServerFn({ method: 'POST' })
  .validator((d: UpdateClientInput) => d)
  .handler(async ({ data }) => {
    const { updateClientImpl } = await import('./clients.server')
    return updateClientImpl(data)
  })

export const deleteClient = createServerFn({ method: 'POST' })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { deleteClientImpl } = await import('./clients.server')
    return deleteClientImpl(data.id)
  })

export const CLIENT_STATUSES: { value: ClientStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'inactive', label: 'Inactive', color: '#f59e0b' },
  { value: 'churned', label: 'Churned', color: '#ef4444' },
]
