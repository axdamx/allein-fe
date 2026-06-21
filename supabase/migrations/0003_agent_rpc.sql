-- ============================================================================
-- Migration 0003: Agent conversation counter helper
-- ============================================================================

create or replace function public.increment_agent_conversation(p_agent_id uuid)
returns void
language sql
security definer set search_path = public
as $$
  update public.agents
  set conversations_count = conversations_count + 1, updated_at = now()
  where id = p_agent_id;
$$;

grant execute on function public.increment_agent_conversation(uuid) to authenticated;
