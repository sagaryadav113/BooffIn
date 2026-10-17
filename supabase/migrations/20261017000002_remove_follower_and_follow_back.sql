-- ============================================================================
-- BOOFFIN — REMOVE FOLLOWER & FOLLOW BACK CAPABILITIES
-- Migration: 20261017000002_remove_follower_and_follow_back.sql
-- Description:
--   1. Updates RLS policy on public.follows to allow users to remove their own followers
--   2. Adds public.remove_follower(p_follower_id UUID) RPC function
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATE FOLLOWS DELETE POLICY (ALLOW TARGET USER TO REMOVE FOLLOWER)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users Delete Own Follows" ON public.follows;
CREATE POLICY "Users Delete Own Follows"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- ----------------------------------------------------------------------------
-- 2. CREATE SECURE REMOVE_FOLLOWER RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_follower(p_follower_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_deleted_count INT := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  IF p_follower_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Follower ID required.');
  END IF;

  -- Delete the follow record where follower_id is the target and following_id is current caller
  DELETE FROM public.follows
  WHERE follower_id = p_follower_id AND following_id = v_caller_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Clean up any lingering follow notifications between these users
  DELETE FROM public.notifications
  WHERE user_id = v_caller_id 
    AND actor_id = p_follower_id 
    AND notification_type IN ('follow', 'follow_request', 'follow_accept');

  RETURN jsonb_build_object(
    'success', true, 
    'deleted', v_deleted_count > 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.remove_follower(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_follower(UUID) TO authenticated;
