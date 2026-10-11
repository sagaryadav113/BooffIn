-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - PRIVACY & SECURITY HARDENING MIGRATION
-- Migration: 20261011000001_workspace_privacy_and_security_hardening.sql
-- Description:
--   1. Secure workspace_members insert policy: Prevents unauthorized injection
--      into private DMs and Inner Circle pods.
--   2. Secure workspace_messages update policy: Restricts edits exclusively to sender.
--   3. Atomic toggle_workspace_message_reaction RPC: Safely allows members to react
--      without exposing message content, sender_id, or timestamps to tampering.
--   4. Granular workspace_messages delete policy: Senders can delete their own
--      messages; workspace creators/owners can moderate rule-violating messages.
--   5. Fix workspaces delete policy to honor both creator_id and owner_id.
--   6. Safe atomic leave_workspace RPC.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN WORKSPACE_MEMBERS INSERT POLICY
-- ----------------------------------------------------------------------------
-- Prevents random authenticated users from inserting themselves into DMs or private pods
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_policy"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Workspace creator/owner can add members
    public.is_workspace_creator(workspace_id, auth.uid())
    OR
    -- Normal users can ONLY join public communities that are not disabled
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = workspace_id
          AND w.type = 'community'
          AND COALESCE(w.is_disabled, false) = false
          AND COALESCE(w.is_private, false) = false
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 2. HARDEN WORKSPACE_MESSAGES UPDATE POLICY
-- ----------------------------------------------------------------------------
-- Restrict updates exclusively to message sender
DROP POLICY IF EXISTS "workspace_messages_update_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_update_policy"
  ON public.workspace_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 3. HARDEN WORKSPACE_MESSAGES DELETE POLICY
-- ----------------------------------------------------------------------------
-- Allow sender to delete their own message, or workspace creator to moderate
DROP POLICY IF EXISTS "workspace_messages_delete_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_delete_policy"
  ON public.workspace_messages
  FOR DELETE
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 4. HARDEN WORKSPACES DELETE POLICY
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;
CREATE POLICY "workspaces_delete_policy"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = creator_id
    OR (owner_id IS NOT NULL AND auth.uid() = owner_id)
  );

-- ----------------------------------------------------------------------------
-- 5. ATOMIC RPC: TOGGLE MESSAGE REACTION
-- ----------------------------------------------------------------------------
-- Safely toggles emoji reaction for a member without granting direct UPDATE
-- permissions on message content or sender identity.
CREATE OR REPLACE FUNCTION public.toggle_workspace_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace_id UUID;
  v_current_reactions JSONB;
  v_user_list JSONB;
  v_uid_str TEXT;
  v_new_list JSONB;
  v_result_reactions JSONB;
BEGIN
  -- 1. Identify workspace and current reactions
  SELECT workspace_id, COALESCE(reactions, '{}'::jsonb)
  INTO v_workspace_id, v_current_reactions
  FROM public.workspace_messages
  WHERE id = p_message_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- 2. Verify caller is an active member or creator of the workspace
  IF NOT (public.is_workspace_member(v_workspace_id, auth.uid()) OR public.is_workspace_creator(v_workspace_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to react to messages in this workspace';
  END IF;

  v_uid_str := auth.uid()::TEXT;
  v_user_list := COALESCE(v_current_reactions->p_emoji, '[]'::jsonb);

  -- 3. Toggle reaction: Remove if present, append if absent
  IF v_user_list @> jsonb_build_array(v_uid_str) THEN
    -- Remove user ID
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    INTO v_new_list
    FROM jsonb_array_elements_text(v_user_list) AS elem
    WHERE elem <> v_uid_str;
  ELSE
    -- Append user ID
    v_new_list := v_user_list || jsonb_build_array(v_uid_str);
  END IF;

  -- 4. Update the reactions jsonb object
  IF jsonb_array_length(v_new_list) = 0 THEN
    v_result_reactions := v_current_reactions - p_emoji;
  ELSE
    v_result_reactions := jsonb_set(v_current_reactions, ARRAY[p_emoji], v_new_list, true);
  END IF;

  UPDATE public.workspace_messages
  SET reactions = v_result_reactions
  WHERE id = p_message_id;

  RETURN v_result_reactions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_workspace_message_reaction(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. ATOMIC RPC: SAFE LEAVE WORKSPACE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_workspace(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_creator BOOLEAN;
BEGIN
  SELECT (creator_id = auth.uid() OR owner_id = auth.uid())
  INTO v_is_creator
  FROM public.workspaces
  WHERE id = p_workspace_id;

  IF v_is_creator THEN
    RAISE EXCEPTION 'Creator/Owner cannot leave the workspace. You must transfer ownership or delete the workspace.';
  END IF;

  DELETE FROM public.workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_workspace(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. NOTIFY SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
