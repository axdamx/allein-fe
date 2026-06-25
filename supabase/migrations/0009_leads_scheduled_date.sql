-- ============================================================================
-- Add scheduled_date to leads — the date the "card" is placed in the box slot
-- ============================================================================

alter table public.leads
  add column if not exists scheduled_date date;

create index if not exists leads_scheduled_idx on public.leads(scheduled_date);
