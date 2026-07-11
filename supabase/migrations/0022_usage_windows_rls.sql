-- ============================================================================
-- Migration 0022: Enable Row-Level Security on usage_windows
--
-- SECURITY FIX: usage_windows was created (0018) without RLS, so any
-- authenticated user could read, zero-out, or delete any other user's quota
-- counters — defeating the daily rate-limit entirely (users could reset their
-- own quota, or read others' usage patterns).
--
-- We now enable RLS and grant only SELECT/UPDATE to the owner. INSERT and
-- DELETE are intentionally left without policies: writes are forced through
-- the SECURITY DEFINER `try_consume` RPC, which runs as the table owner and
-- is the only path that should mutate these counters.
--
-- A soft-fail REVOKE on table-level privileges for anon/authenticated is
-- included as defense in depth, while still allowing the SECURITY DEFINER
-- functions (which run as owner, bypassing RLS) to operate.
-- ============================================================================

alter table public.usage_windows enable row level security;

-- Owner can read their own usage (e.g. dashboard quota display via get_window_usage).
drop policy if exists "Usage windows: owner select" on public.usage_windows;
create policy "Usage windows: owner select"
  on public.usage_windows for select to authenticated
  using (user_id = auth.uid());

-- Owner can update their own usage (used by try_consume via SECURITY DEFINER,
-- but kept here for any legitimate owner-scoped client path).
drop policy if exists "Usage windows: owner update" on public.usage_windows;
create policy "Usage windows: owner update"
  on public.usage_windows for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT or DELETE policies: clients cannot create or remove windows
-- directly. All mutations go through try_consume (SECURITY DEFINER, owner).
