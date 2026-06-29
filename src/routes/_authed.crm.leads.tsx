import { Outlet, createFileRoute } from '@tanstack/react-router'

const LeadsLayout = () => <Outlet />

export const Route = createFileRoute('/_authed/crm/leads')({
  component: LeadsLayout,
})
