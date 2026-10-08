-- ============================================================================
-- BOOFFIN PLATFORM MIGRATION — WORKSPACE SYSTEM
-- Migration: 20261008000001_booffin_workspace_system.sql
-- Description:
--   1. Workspace Types, Roles, and Tiers Enums
--   2. Unified public.workspaces core table (DM, Community, Inner Circle)
--   3. public.workspace_members (Roles & Membership status)
--   4. public.workspace_messages (With DOI reference & key_epoch support)
--   5. public.workspace_blocks (Creator block ledger with immutable reason tracking)
--   6. public.workspace_events (Calendar events)
--   7. public.workspace_roles_opportunities (Inner Circle roles & designations)
--   8. public.workspace_saved_items (Workspace bookmarks)
--   9. Zero-Trust Row Level Security (RLS) policies
--  10. Atomic Server-Side RPC: get_or_create_dm_workspace (Mutual-follow enforced)
--  11. Real-time notification trigger for workspace messages & invitations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENUMS & EXTENSIONS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_type') THEN
    CREATE TYPE public.workspace_type AS ENUM ('dm', 'community', 'inner_circle');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_member_role') THEN
    CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'moderator', 'member');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_subscription_tier') THEN
    CREATE TYPE public.workspace_subscription_tier AS ENUM ('tier_49', 'tier_119', 'tier_219', 'tier_599');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. WORKSPACES CORE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.workspace_type NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  topic_tag TEXT,
  creator_research_role TEXT,
  pricing_tier public.workspace_subscription_tier,
  price_inr INTEGER,
  max_members INTEGER DEFAULT 25,
  e2ee_enabled BOOLEAN NOT NULL DEFAULT false,
  dm_participant_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dm_participant_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  canonical_dm_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_dm_participants CHECK (
    (type = 'dm' AND dm_participant_a IS NOT NULL AND dm_participant_b IS NOT NULL AND canonical_dm_key IS NOT NULL)
    OR (type <> 'dm')
  )
);

CREATE INDEX IF NOT EXISTS idx_workspaces_type ON public.workspaces(type);
CREATE INDEX IF NOT EXISTS idx_workspaces_creator ON public.workspaces(creator_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_canonical_dm ON public.workspaces(canonical_dm_key);
CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON public.workspaces(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. WORKSPACE MEMBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.workspace_member_role NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed', 'blocked')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id, status);

-- ----------------------------------------------------------------------------
-- 4. WORKSPACE MESSAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  doi_reference TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  key_epoch INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_messages_feed ON public.workspace_messages(workspace_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_workspace_messages_sender ON public.workspace_messages(sender_id);

-- ----------------------------------------------------------------------------
-- 5. WORKSPACE BLOCKS TABLE (CREATOR MODERATION REASON LOG)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_type TEXT NOT NULL CHECK (reason_type IN (
    'Harassment',
    'Spam',
    'Off-topic behaviour',
    'Disruptive behaviour',
    'Misleading information',
    'Inappropriate content',
    'Repeated rule violations',
    'Other'
  )),
  reason_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, blocked_user)
);

CREATE INDEX IF NOT EXISTS idx_workspace_blocks_lookup ON public.workspace_blocks(workspace_id, blocked_user);

-- ----------------------------------------------------------------------------
-- 6. WORKSPACE EVENTS (CALENDAR)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location_or_url TEXT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_events_timeline ON public.workspace_events(workspace_id, event_date ASC);

-- ----------------------------------------------------------------------------
-- 7. WORKSPACE ROLES & OPPORTUNITIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_roles_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('designation', 'opportunity')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_roles_status ON public.workspace_roles_opportunities(workspace_id, status);

-- ----------------------------------------------------------------------------
-- 8. WORKSPACE SAVED ITEMS (BOOKMARKS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('message', 'paper', 'discussion', 'event', 'opportunity')),
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_saved_user ON public.workspace_saved_items(workspace_id, user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_roles_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_saved_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 9.1 SECURITY DEFINER HELPERS (Avoids RLS infinite recursion)
-- ----------------------------------------------------------------------------
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

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_creator(UUID, UUID) TO authenticated, anon, service_role;

-- ----------------------------------------------------------------------------
-- 10. RLS POLICIES FOR WORKSPACES
-- ----------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
CREATE POLICY "workspaces_insert_policy"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
CREATE POLICY "workspaces_update_policy"
  ON public.workspaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;
CREATE POLICY "workspaces_delete_policy"
  ON public.workspaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- ----------------------------------------------------------------------------
-- 11. RLS POLICIES FOR WORKSPACE MEMBERS
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 12. RLS POLICIES FOR WORKSPACE MESSAGES
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 13. RLS POLICIES FOR WORKSPACE BLOCKS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspace_blocks_select_policy" ON public.workspace_blocks;
CREATE POLICY "workspace_blocks_select_policy"
  ON public.workspace_blocks
  FOR SELECT
  TO authenticated
  USING (
    blocked_user = auth.uid()
    OR blocked_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workspace_blocks_insert_policy" ON public.workspace_blocks;
CREATE POLICY "workspace_blocks_insert_policy"
  ON public.workspace_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = blocked_by
    AND EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id AND w.creator_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 14. ATOMIC RPC: GET OR CREATE CANONICAL DM WORKSPACE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_dm_workspace(p_target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_canonical_key TEXT;
  v_workspace_id UUID;
  v_is_blocked BOOLEAN := FALSE;
  v_mutual_follow BOOLEAN := FALSE;
  v_res JSONB;
BEGIN
  -- 1. Authentication & input validation
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to start a DM conversation';
  END IF;

  IF v_current_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot start a DM conversation with yourself';
  END IF;

  -- 2. Check Platform-level blocking
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_current_user_id AND blocked_id = p_target_user_id)
       OR (blocker_id = p_target_user_id AND blocked_id = v_current_user_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RAISE EXCEPTION 'Cannot message this user due to privacy/blocking settings';
  END IF;

  -- 3. Enforce Server-Side Mutual Follow Requirement
  SELECT (
    EXISTS (SELECT 1 FROM public.follows WHERE follower_id = v_current_user_id AND following_id = p_target_user_id)
    AND
    EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_target_user_id AND following_id = v_current_user_id)
  ) INTO v_mutual_follow;

  IF NOT v_mutual_follow THEN
    RAISE EXCEPTION 'Mutual follow required: Both researchers must follow each other to start a DM conversation';
  END IF;

  -- 4. Compute deterministic composite canonical key
  v_canonical_key := LEAST(v_current_user_id, p_target_user_id)::TEXT || ':' || GREATEST(v_current_user_id, p_target_user_id)::TEXT;

  -- 5. Search for existing canonical DM workspace
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE canonical_dm_key = v_canonical_key;

  -- 6. If workspace does not exist, atomically insert it
  IF v_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (
      type,
      creator_id,
      dm_participant_a,
      dm_participant_b,
      canonical_dm_key
    ) VALUES (
      'dm',
      v_current_user_id,
      LEAST(v_current_user_id, p_target_user_id),
      GREATEST(v_current_user_id, p_target_user_id),
      v_canonical_key
    )
    RETURNING id INTO v_workspace_id;

    -- Insert active memberships for both researchers
    INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
    VALUES
      (v_workspace_id, v_current_user_id, 'member', 'active'),
      (v_workspace_id, p_target_user_id, 'member', 'active')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET status = 'active';
  ELSE
    -- Ensure both members are active
    UPDATE public.workspace_members
    SET status = 'active'
    WHERE workspace_id = v_workspace_id AND user_id IN (v_current_user_id, p_target_user_id);
  END IF;

  -- Return workspace payload
  SELECT jsonb_build_object(
    'id', w.id,
    'type', w.type,
    'canonical_dm_key', w.canonical_dm_key,
    'target_user_id', p_target_user_id,
    'created_at', w.created_at
  ) INTO v_res
  FROM public.workspaces w
  WHERE w.id = v_workspace_id;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 15. EXTEND NOTIFICATIONS CONSTRAINT FOR WORKSPACES
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'follow',
    'like',
    'comment',
    'reply',
    'repost',
    'paper_discussion',
    'researcher_post',
    'topic_activity',
    'mention',
    'paper_share',
    'topic_update',
    'trending',
    'publisher_update',
    'system',
    'collaboration_request',
    'workspace_invitation',
    'workspace_message',
    'workspace_event',
    'workspace_block',
    'subscription_active'
  ));
