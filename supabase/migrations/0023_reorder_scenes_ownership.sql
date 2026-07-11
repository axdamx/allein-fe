-- ============================================================================
-- Migration 0023: Add ownership check to reorder_studio_scenes RPC
--
-- SECURITY FIX: reorder_studio_scenes was SECURITY DEFINER (runs as table
-- owner, bypassing RLS) but never verified that the supplied storyboard
-- belongs to the caller, nor that the supplied scene ids belong to that
-- storyboard. Any authenticated user could reorder (or corrupt via the unique
-- position constraint) scenes in another user's storyboard.
--
-- The fix:
--   1. Assert the storyboard's owner_id matches auth.uid(); raise otherwise.
--   2. Scope every UPDATE by both id AND storyboard_id, so even if a foreign
--      scene id is passed it won't be touched.
--   3. Wrap in a transaction so positions are written atomically.
--
-- Note: this depends on the studio_storyboards table, whose owner_id is
-- auth.users(id). We use an explicit join rather than relying on RLS (this
-- function is SECURITY DEFINER and bypasses RLS by design).
-- ============================================================================

create or replace function public.reorder_studio_scenes(
  p_storyboard_id uuid,
  p_scene_ids uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer := 0;
  sid uuid;
  v_owner uuid;
begin
  -- Verify the storyboard belongs to the caller. SECURITY DEFINER bypasses
  -- RLS, so we check owner_id explicitly.
  select owner_id into v_owner
    from public.studio_storyboards
    where id = p_storyboard_id;

  if v_owner is null then
    raise exception 'Storyboard not found';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  -- Reorder, scoped to this storyboard so foreign scene ids are no-ops.
  foreach sid in array p_scene_ids loop
    update public.studio_scenes
      set position = i
      where id = sid and storyboard_id = p_storyboard_id;
    i := i + 1;
  end loop;
end;
$$;

-- Re-grant execute (CREATE OR REPLACE preserves the grant, but be explicit).
grant execute on function public.reorder_studio_scenes(uuid, uuid[]) to authenticated;
