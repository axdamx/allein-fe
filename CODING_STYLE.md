# Coding Style & Conventions

> Established during the great refactor (June 2026). All new code must follow these conventions unless there's a documented exception.

---

## 1. Function Declarations

### Use `const` arrow functions for everything — components, hooks, utilities, helpers.

```typescript
// ✅ Correct
const MyComponent = () => { ... }

export const useMyHook = () => { ... }

export const getSomething = (arg: string) => { ... }

// Private helpers (same file)
const helper = () => { ... }
```

### Exception: Route page components referenced before their `const` declaration

When a `Route` config references a component above its definition, `const` causes a TDZ error. These must use `function`.

```typescript
// Route defined first (line 30), component defined after (line 50)
export const Route = createFileRoute('/_authed/chat')({
  component: ChatPage,  // Would TDZ if ChatPage were const
})

function ChatPage() {   // Must use function — defined after Route
  ...
}
```

If the component is defined **before** the `Route`, `const` works fine:

```typescript
const SettingsPage = () => { ... }  // Defined first

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,  // No TDZ — already in scope
})
```

### What NOT to do

```typescript
// ❌ Avoid — blocked on function declarations
export function cn(...inputs: ClassValue[]) {  // Convert to const

// ❌ Avoid — extra const + assignment wrap
const cn = function(...inputs: ClassValue[]) {

// ✅ Do this
export const cn = (...inputs: ClassValue[]) => {
```

---

## 2. Component Structure

### Route files (pages) should be lean

A route file (`routes/`) should contain:
- The `Route` config
- Imports
- The main page component (or `function` if TDZ)

All sub-components go in `components/<module>/` directory.

### Component extraction pattern

```typescript
// routes/_authed.foo.tsx
import { FooHeader } from '@/components/foo/foo-header'
import { FooList } from '@/components/foo/foo-list'
import { FooEmpty } from '@/components/foo/foo-empty'
import { getFooUtils } from '@/components/foo/foo-utils'

const FooPage = () => { ... }

export const Route = createFileRoute('/_authed/foo')({
  component: FooPage,
})
```

### Naming conventions

| Type | Pattern | Example |
|---|---|---|
| Page component | `XxxPage` | `FooPage`, `SettingsPage` |
| Sub-component | `Xxx` | `FooHeader`, `FooList` |
| Utility file | `<module>-utils.ts` | `foo-utils.ts`, `chat-utils.ts` |
| Constants file | `<module>.constants.ts` | `planner.constants.ts` |
| Hook | `useXxx` | `useChat`, `usePlan` |

---

## 3. Imports

### Use `@/` path aliases (no relative imports)

```typescript
// ✅ Correct
import { Button } from '@/components/ui/button'
import { useChat } from '@/hooks/use-chat'
import { cn } from '@/lib/utils'
import { type AppUser } from '@/router'

// ❌ Wrong
import { Button } from '../../../components/ui/button'
```

### Named imports preferred over wildcard re-exports

```typescript
// ✅ Correct — explicit imports
import { FooHeader } from '@/components/foo/foo-header'
import { FooList } from '@/components/foo/foo-list'

// ❌ Avoid — barrel file obscures dependencies
import { FooHeader, FooList } from '@/components/foo'
```

### Type imports

```typescript
// Use `type` modifier for type-only imports
import { type MyType } from './types'
```

---

## 4. Server Function Pattern

### Thin RPC layer + dynamic `.server.ts` import

```typescript
// profile.ts (client-safe, no server imports at module scope)
export const getPlan = createServerFn({ method: 'GET' }).handler(async () => {
  const { getPlanImpl } = await import('./profile.server')
  return getPlanImpl()
})
```

- The public `.ts` file has **no server-only imports** at module scope
- Implementation lives in `.server.ts` files (never bundled to client)
- Server functions use `async` arrow handlers passed to `.handler()`

---

## 5. Hooks

### All hooks use `const` + arrow syntax

```typescript
export const useMyFeature = () => {
  return useQuery({ ... })
}
```

### Hook file naming

| File | Exports |
|---|---|
| `hooks/use-agents.ts` | `useAgents`, `useAgent`, `useCreateAgent`, etc. |
| `hooks/use-crm.ts` | `useLeads`, `useLead`, `useCreateLead`, etc. |

Group related hooks in the same file.

---

## 6. Custom Hook Patterns

### Progressive message reveal (chat)

```typescript
const { messages, send, isPending } = useChatStream()
// Client adds optimistic message immediately
// Server streams back reply tokens progressively (~12ms per chunk)
```

### Optimistic updates

```typescript
// Show UI change instantly before server confirms
queryClient.setQueryData(key, (old) => [...(old ?? []), newItem])

// Invalidate on success to sync with real server state
queryClient.invalidateQueries({ queryKey: key })
```

---

## 7. Exceptions File (`AGENTS.md`)

If this project uses AI coding assistants (Claude, opencode, etc.), keep an `AGENTS.md` file at the project root with:
- Build commands
- Test commands
- Conventions that differ from defaults
- Any gotchas (e.g., `routeTree.gen.ts` is auto-generated, don't edit)

This lets AI agents automatically follow project conventions without being told every time.

---

## 8. What We Don't Touch

These are considered external/library code and are **not** refactored:

| File/Directory | Reason |
|---|---|
| `src/components/ui/` | shadcn/ui primitives — follow their own conventions |
| `src/routeTree.gen.ts` | Auto-generated by TanStack Router |
| `*.server.ts` | Server-only files — backend implementation |
| `*.server.ts` inside `src/lib/supabase/` | Server-only Supabase client |

---

## Summary Checklist

- [ ] `const Xxx = () => {` — not `function` (except TDZ cases)
- [ ] `@/` path aliases — no relative imports
- [ ] Route files are thin — sub-components extracted
- [ ] Named imports per file — no barrel indexes
- [ ] `.server.ts` code dynamically imported — no direct module-level import
- [ ] Hooks use `const` + arrow syntax
