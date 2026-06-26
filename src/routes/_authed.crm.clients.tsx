import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/crm/clients')({
  component: ClientsLayout,
})

function ClientsLayout() {
  return <Outlet />
}
