import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/crm/leads')({
  component: LeadsLayout,
})

function LeadsLayout() {
  return <Outlet />
}
