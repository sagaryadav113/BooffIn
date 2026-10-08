-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - EXPAND INNER CIRCLE SCHEMA
-- Migration: 20261008000005_expand_inner_circle_features.sql
-- ============================================================================

-- 1. Expand workspace_events
ALTER TABLE public.workspace_events
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'lab_meeting',
  ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Sync start_time from event_date if event_date exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_events' AND column_name = 'event_date'
  ) THEN
    UPDATE public.workspace_events 
    SET start_time = event_date 
    WHERE start_time IS NULL AND event_date IS NOT NULL;
  END IF;
END $$;

-- 2. Expand workspace_roles_opportunities
ALTER TABLE public.workspace_roles_opportunities
  ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS compensation TEXT,
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- Relax any legacy role_type check constraint on workspace_roles_opportunities
DO $$
BEGIN
  ALTER TABLE public.workspace_roles_opportunities DROP CONSTRAINT IF EXISTS workspace_roles_opportunities_role_type_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Expand workspace_saved_items
ALTER TABLE public.workspace_saved_items
  ADD COLUMN IF NOT EXISTS note TEXT;

-- Make title nullable or default if note is used
ALTER TABLE public.workspace_saved_items
  ALTER COLUMN title DROP NOT NULL;

-- 4. Expand workspace_members
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT now();

-- 5. RPC to invite a member to an Inner Circle (enforcing max 25 members limit)
CREATE OR REPLACE FUNCTION public.invite_inner_circle_member(
  p_workspace_id UUID,
  p_target_user_id UUID,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_workspace public.workspaces%ROWTYPE;
  v_current_count INTEGER;
  v_caller_id UUID := auth.uid();
  v_is_member BOOLEAN;
BEGIN
  -- 1. Fetch workspace
  SELECT * INTO v_workspace FROM public.workspaces WHERE id = p_workspace_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace not found');
  END IF;

  -- 2. Verify caller is an active member/owner
  IF v_caller_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = p_workspace_id AND user_id = v_caller_id AND status = 'active'
    ) INTO v_is_member;

    IF NOT v_is_member AND v_workspace.creator_id <> v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only active members can invite researchers');
    END IF;
  END IF;

  -- 3. Check current member count against max_members
  SELECT count(*) INTO v_current_count 
  FROM public.workspace_members 
  WHERE workspace_id = p_workspace_id AND status = 'active';

  IF v_current_count >= COALESCE(v_workspace.max_members, 25) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Inner Circle pod capacity reached (maximum ' || COALESCE(v_workspace.max_members, 25) || ' members)');
  END IF;

  -- 4. Upsert member
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status, joined_at)
  VALUES (p_workspace_id, p_target_user_id, p_role::public.workspace_member_role, 'active', now())
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET status = 'active', role = EXCLUDED.role;

  RETURN jsonb_build_object('success', true, 'error', NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_inner_circle_member(UUID, UUID, TEXT) TO authenticated, anon, service_role;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
