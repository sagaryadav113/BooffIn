-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - REACTIONS, EDITING, AND DELETION SCHEMA
-- ============================================================================
-- Adds reactions (JSONB), is_edited, and is_deleted columns to workspace_messages
-- ============================================================================

ALTER TABLE public.workspace_messages
  ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Allow users to update their own messages (edit, soft-delete, or add reactions)
DROP POLICY IF EXISTS "workspace_messages_update_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_update_policy"
  ON public.workspace_messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
  );

-- Reload schema
NOTIFY pgrst, 'reload schema';
