import { Outlet, createFileRoute } from '@tanstack/react-router'

const ClientsLayout = () => <Outlet />

export const Route = createFileRoute('/_authed/crm/clients')({
  component: ClientsLayout,
})
