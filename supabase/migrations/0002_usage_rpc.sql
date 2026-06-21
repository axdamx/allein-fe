-- ============================================================================
-- Migration 0002: Usage counter RPC + dashboard aggregate helpers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- increment_usage: atomically bump a usage counter on profiles.
-- Used by server functions after creating agents, sending messages, etc.
-- ----------------------------------------------------------------------------
create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric text,
  p_amount int default 1
)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
  set
    agents_count        = case when p_metric = 'agents_count'        then agents_count + p_amount        else agents_count end,
    conversations_count = case when p_metric = 'conversations_count' then conversations_count + p_amount else conversations_count end,
    messages_count      = case when p_metric = 'messages_count'      then messages_count + p_amount      else messages_count end,
    posts_count         = case when p_metric = 'posts_count'         then posts_count + p_amount         else posts_count end,
    documents_count     = case when p_metric = 'documents_count'     then documents_count + p_amount     else documents_count end,
    updated_at = now()
  where id = p_user_id;
$$;

-- ----------------------------------------------------------------------------
-- decrement_usage: reverse of the above (for deletes / rollbacks).
-- ----------------------------------------------------------------------------
create or replace function public.decrement_usage(
  p_user_id uuid,
  p_metric text,
  p_amount int default 1
)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles
  set
    agents_count        = greatest(0, case when p_metric = 'agents_count'        then agents_count - p_amount        else agents_count end),
    conversations_count = greatest(0, case when p_metric = 'conversations_count' then conversations_count - p_amount else conversations_count end),
    messages_count      = greatest(0, case when p_metric = 'messages_count'      then messages_count - p_amount      else messages_count end),
    posts_count         = greatest(0, case when p_metric = 'posts_count'         then posts_count - p_amount         else posts_count end),
    documents_count     = greatest(0, case when p_metric = 'documents_count'     then documents_count - p_amount     else documents_count end),
    updated_at = now()
  where id = p_user_id;
$$;

-- ----------------------------------------------------------------------------
-- get_dashboard_stats: aggregated counts for the dashboard overview.
-- Returns a single JSON row with all the numbers the dashboard needs.
-- ----------------------------------------------------------------------------
create or replace function public.get_dashboard_stats(p_user_id uuid)
returns json
language sql
security definer set search_path = public
as $$
  select json_build_object(
    'agents', (select count(*) from public.agents where owner_id = p_user_id and status in ('active','paused')),
    'active_agents', (select count(*) from public.agents where owner_id = p_user_id and status = 'active'),
    'conversations', (select count(*) from public.conversations where owner_id = p_user_id and is_archived = false),
    'messages', (select count(*) from public.messages m join public.conversations c on c.id = m.conversation_id where c.owner_id = p_user_id),
    'leads', (select count(*) from public.leads where owner_id = p_user_id),
    'new_leads', (select count(*) from public.leads where owner_id = p_user_id and status = 'new'),
    'deals', (select count(*) from public.deals where owner_id = p_user_id),
    'open_deals', (select count(*) from public.deals where owner_id = p_user_id and stage not in ('closed_won','closed_lost')),
    'pipeline_value', (select coalesce(sum(value),0) from public.deals where owner_id = p_user_id and stage not in ('closed_won','closed_lost')),
    'scheduled_posts', (select count(*) from public.posts where owner_id = p_user_id and status = 'scheduled'),
    'documents', (select count(*) from public.documents where owner_id = p_user_id)
  );
$$;

-- Grant execute to authenticated users (RLS on underlying tables protects data)
grant execute on function public.increment_usage(uuid, text, int) to authenticated;
grant execute on function public.decrement_usage(uuid, text, int) to authenticated;
grant execute on function public.get_dashboard_stats(uuid) to authenticated;
