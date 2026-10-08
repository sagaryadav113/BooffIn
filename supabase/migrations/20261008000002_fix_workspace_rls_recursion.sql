-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - RLS RECURSION FIX
-- ============================================================================
-- Fixes infinite recursion in RLS policies for workspace_members by using
-- a STABLE SECURITY DEFINER helper function that bypasses RLS during evaluation.
-- ============================================================================

-- 1. Helper function: Check if current/given user is an active member
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated, anon, service_role;

-- 2. Helper function: Check if user is workspace owner/creator
CREATE OR REPLACE FUNCTION public.is_workspace_creator(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = p_workspace_id
      AND creator_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_creator(UUID, UUID) TO authenticated, anon, service_role;

-- 3. Fix WORKSPACE_MEMBERS policies
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_select_policy"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_policy"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_update_policy"
  ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

-- 4. Fix WORKSPACES select policy
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
CREATE POLICY "workspaces_select_policy"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    type = 'community'
    OR creator_id = auth.uid()
    OR (type = 'dm' AND (dm_participant_a = auth.uid() OR dm_participant_b = auth.uid()))
    OR public.is_workspace_member(id, auth.uid())
  );

-- 5. Fix WORKSPACE_MESSAGES policies
DROP POLICY IF EXISTS "workspace_messages_select_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_select_policy"
  ON public.workspace_messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_messages_insert_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_insert_policy"
  ON public.workspace_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      public.is_workspace_member(workspace_id, auth.uid())
      OR public.is_workspace_creator(workspace_id, auth.uid())
    )
  );

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
