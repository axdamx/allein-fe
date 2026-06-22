-- Add agent_type to profiles — set during onboarding
-- Restricts which agent types the user can create
alter table public.profiles
  add column if not exists agent_type agent_type_key;

create index if not exists profiles_agent_type_idx on public.profiles(agent_type);
