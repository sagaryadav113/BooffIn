-- ============================================================================
-- BOOFFIN — ACCEPT FOLLOW REQUEST RPC & FOLLOWS INSERT RLS POLICY FIX
-- Migration: 20261021000001_fix_accept_follow_request_rpc_and_policy.sql
-- Description:
--   1. Updates RLS policy on public.follows to allow target users (following_id)
--      to insert follow rows when accepting follow requests, in addition to followers.
--   2. Adds public.accept_follow_request(p_requester_id UUID) RPC function (SECURITY DEFINER)
--      to atomically create follow relationship, resolve request, mark notification read,
--      and notify the requester.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATE FOLLOWS INSERT POLICY
-- ----------------------------------------------------------------------------
-- Allow both the follower (initiator) AND the target being followed (recipient
-- confirming a follow request) to insert into public.follows.
DROP POLICY IF EXISTS "Users Insert Own Follows" ON public.follows;
CREATE POLICY "Users Insert Own Follows"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = follower_id OR auth.uid() = following_id) AND
    follower_id <> following_id
  );

-- ----------------------------------------------------------------------------
-- 2. CREATE SECURE ACCEPT_FOLLOW_REQUEST RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_follow_request(p_requester_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  IF p_requester_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requester ID required.');
  END IF;

  IF v_caller_id = p_requester_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot accept request from oneself.');
  END IF;

  -- 1. Insert into follows (requester follows caller/target)
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (p_requester_id, v_caller_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- 2. Update status and remove follow request row
  UPDATE public.follow_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE requester_id = p_requester_id AND target_id = v_caller_id;

  DELETE FROM public.follow_requests
  WHERE requester_id = p_requester_id AND target_id = v_caller_id;

  -- 3. Mark incoming follow_request notification as read
  UPDATE public.notifications
  SET read_status = TRUE
  WHERE recipient_id = v_caller_id
    AND actor_id = p_requester_id
    AND (type = 'follow_request' OR notification_type = 'follow_request');

  -- 4. Notify requester that request was accepted
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    notification_type,
    entity_type,
    entity_id,
    content,
    message_snippet,
    metadata,
    read_status,
    created_at
  )
  VALUES (
    p_requester_id,
    v_caller_id,
    'follow_accept',
    'follow_accept',
    'profile',
    v_caller_id::text,
    'accepted your follow request',
    'accepted your follow request',
    jsonb_build_object('accepted_by', v_caller_id),
    FALSE,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_follow_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID) TO authenticated;
