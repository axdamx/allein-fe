# Allein

Frontend for the Allein AI agent platform. Currently a UI mock with a
login/signup flow and a rich dashboard.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **TanStack Router** (file-based) + **TanStack Query**
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **lucide-react** icons, **next-themes** dark mode

## Getting started

```bash
yarn install
yarn dev      # start dev server
yarn build    # typecheck + production build
yarn preview  # preview the production build
```

## Product guides

- [Beta tester getting started guide](docs/BETA_TESTER_GETTING_STARTED.md)
- [Marketing Studio user guide](docs/STUDIO_USER_GUIDE.md) — the revamped
  Studio is currently on `codex/studio-content-centre` and is coming soon to
  `main`
- [Lead reminders and notification centre implementation plan](docs/LEAD_REMINDERS_NOTIFICATION_PLAN.md)

## Project structure

```
src/
  routes/           # file-based routes (login, dashboard, index redirect)
  components/
    ui/             # shadcn primitives
    layout/         # sidebar, topbar, dashboard shell
    dashboard/      # stat cards, chart, agents table, activity, conversations
    auth/           # login/signup form
  data/mock.ts      # mock data (agents, stats, activity, conversations)
  router.tsx        # router + query client setup
  index.css         # Tailwind + theme tokens
```

## Notes

This is a **mock** — auth and data are static. Submitting the auth form
simulates success and navigates to the dashboard. The agents table uses
TanStack Query against local mock data to demonstrate the wiring.
