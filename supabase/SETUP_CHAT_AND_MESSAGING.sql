-- ============================================================================
-- BOOFFIN PLATFORM — CHAT, DIRECT MESSAGING & USER SETTINGS ACTIVATION
-- Run this script in your new Supabase project's SQL Editor to enable all
-- live chat, DMs, real-time messaging, and settings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USER SETTINGS & PREFERENCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notifications Settings
  notify_likes BOOLEAN NOT NULL DEFAULT TRUE,
  notify_comments BOOLEAN NOT NULL DEFAULT TRUE,
  notify_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  notify_reposts BOOLEAN NOT NULL DEFAULT TRUE,
  notify_paper_discussions BOOLEAN NOT NULL DEFAULT TRUE,
  notify_collaboration_requests BOOLEAN NOT NULL DEFAULT TRUE,
  notify_researcher_posts BOOLEAN NOT NULL DEFAULT TRUE,
  notify_topic_activity BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_digest BOOLEAN NOT NULL DEFAULT TRUE,

  -- Privacy & Safety Settings
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'registered', 'private')),
  allow_connection_requests TEXT NOT NULL DEFAULT 'everyone' CHECK (allow_connection_requests IN ('everyone', 'verified_only', 'none')),
  allow_direct_messages TEXT NOT NULL DEFAULT 'connections' CHECK (allow_direct_messages IN ('everyone', 'connections', 'none')),
  email_visibility TEXT NOT NULL DEFAULT 'private' CHECK (email_visibility IN ('public', 'connections', 'private')),
  show_likes_on_profile BOOLEAN NOT NULL DEFAULT TRUE,
  show_activity_status BOOLEAN NOT NULL DEFAULT TRUE,
  filter_sensitive_content BOOLEAN NOT NULL DEFAULT TRUE,

  -- Networking & Recommendations
  discoverable_by_interests BOOLEAN NOT NULL DEFAULT TRUE,
  recommend_researchers BOOLEAN NOT NULL DEFAULT TRUE,
  recommend_topics BOOLEAN NOT NULL DEFAULT TRUE,

  -- Appearance & Experience
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  default_tab TEXT NOT NULL DEFAULT 'For You' CHECK (default_tab IN ('For You', 'Following')),
  reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backfill default settings for all existing users
INSERT INTO public.user_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Auto-initialize settings for any newly registered user
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_init_user_settings ON public.profiles;
CREATE TRIGGER trg_init_user_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();


-- ----------------------------------------------------------------------------
-- 2. USER BLOCKS TABLE (Required for Privacy & Safe DM Checks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select_policy" ON public.user_blocks;
CREATE POLICY "user_blocks_select_policy" ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

DROP POLICY IF EXISTS "user_blocks_insert_policy" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_policy" ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "user_blocks_delete_policy" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_policy" ON public.user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());


-- ----------------------------------------------------------------------------
-- 3. WORKSPACES, ROOMS & DIRECT MESSAGING TABLES
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

-- Drop empty placeholder workspaces tables if any exist
DROP TABLE IF EXISTS public.workspace_saved_items CASCADE;
DROP TABLE IF EXISTS public.workspace_roles_opportunities CASCADE;
DROP TABLE IF EXISTS public.workspace_events CASCADE;
DROP TABLE IF EXISTS public.workspace_blocks CASCADE;
DROP TABLE IF EXISTS public.workspace_messages CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

-- Create core unified workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.workspace_type NOT NULL DEFAULT 'dm',
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  slug TEXT,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  topic_tag TEXT,
  creator_research_role TEXT,
  pricing_tier public.workspace_subscription_tier,
  price_inr INTEGER,
  subscription_tier TEXT DEFAULT 'free',
  subscription_price_inr INTEGER DEFAULT 0,
  max_members INTEGER DEFAULT 25,
  is_private BOOLEAN DEFAULT false,
  e2ee_enabled BOOLEAN NOT NULL DEFAULT false,
  dm_participant_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dm_participant_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  canonical_dm_key TEXT UNIQUE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_dm_participants CHECK (
    (type = 'dm' AND dm_participant_a IS NOT NULL AND dm_participant_b IS NOT NULL AND canonical_dm_key IS NOT NULL)
    OR (type <> 'dm')
  )
);

CREATE INDEX idx_workspaces_type ON public.workspaces(type);
CREATE INDEX idx_workspaces_creator ON public.workspaces(creator_id);
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_canonical_dm ON public.workspaces(canonical_dm_key);
CREATE INDEX idx_workspaces_created_at ON public.workspaces(created_at DESC);

-- Workspace members table
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.workspace_member_role NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed', 'blocked')),
  is_muted BOOLEAN DEFAULT false,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id, status);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id, status);

-- Workspace messages table (Chat & DMs)
CREATE TABLE public.workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  doi_reference TEXT,
  doi_metadata JSONB DEFAULT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  media_urls TEXT[] DEFAULT NULL,
  reactions JSONB DEFAULT '{}'::jsonb,
  e2ee_ciphertext TEXT DEFAULT NULL,
  e2ee_nonce TEXT DEFAULT NULL,
  reply_to_id UUID REFERENCES public.workspace_messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  is_forwarded BOOLEAN DEFAULT FALSE,
  key_epoch INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_messages_feed ON public.workspace_messages(workspace_id, created_at ASC);
CREATE INDEX idx_workspace_messages_sender ON public.workspace_messages(sender_id);

-- Workspace blocks table
CREATE TABLE public.workspace_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_type TEXT NOT NULL DEFAULT 'Other',
  reason_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, blocked_user)
);

-- Workspace events (Calendar & Meetings)
CREATE TABLE public.workspace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  event_type TEXT DEFAULT 'lab_meeting',
  meeting_link TEXT,
  location_or_url TEXT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace opportunities & roles
CREATE TABLE public.workspace_roles_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  role_type TEXT NOT NULL DEFAULT 'opportunity',
  description TEXT,
  compensation TEXT,
  is_open BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workspace bookmarks & saved items
CREATE TABLE public.workspace_saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
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
      AND (creator_id = p_user_id OR owner_id = p_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_creator(UUID, UUID) TO authenticated, anon, service_role;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_roles_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_saved_items ENABLE ROW LEVEL SECURITY;

-- Workspaces RLS
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
CREATE POLICY "workspaces_select_policy" ON public.workspaces FOR SELECT TO authenticated
  USING (
    type = 'community'
    OR creator_id = auth.uid()
    OR owner_id = auth.uid()
    OR (type = 'dm' AND (dm_participant_a = auth.uid() OR dm_participant_b = auth.uid()))
    OR public.is_workspace_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
CREATE POLICY "workspaces_insert_policy" ON public.workspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
CREATE POLICY "workspaces_update_policy" ON public.workspaces FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = owner_id)
  WITH CHECK (auth.uid() = creator_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;
CREATE POLICY "workspaces_delete_policy" ON public.workspaces FOR DELETE TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = owner_id);

-- Workspace Members RLS
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_select_policy" ON public.workspace_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
CREATE POLICY "workspace_members_update_policy" ON public.workspace_members FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

-- Workspace Messages RLS
DROP POLICY IF EXISTS "workspace_messages_select_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_select_policy" ON public.workspace_messages FOR SELECT TO authenticated
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS "workspace_messages_insert_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_insert_policy" ON public.workspace_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      public.is_workspace_member(workspace_id, auth.uid())
      OR public.is_workspace_creator(workspace_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "workspace_messages_update_policy" ON public.workspace_messages;
CREATE POLICY "workspace_messages_update_policy" ON public.workspace_messages FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  )
  WITH CHECK (
    sender_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
    OR public.is_workspace_creator(workspace_id, auth.uid())
  );


-- ----------------------------------------------------------------------------
-- 5. ATOMIC RPC: GET OR CREATE CANONICAL DM WORKSPACE
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_dm_workspace(p_target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_canonical_key TEXT;
  v_workspace_id UUID;
  v_is_blocked BOOLEAN := FALSE;
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

  -- 3. Compute deterministic composite canonical key
  v_canonical_key := LEAST(v_current_user_id, p_target_user_id)::TEXT || ':' || GREATEST(v_current_user_id, p_target_user_id)::TEXT;

  -- 4. Search for existing canonical DM workspace
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE canonical_dm_key = v_canonical_key;

  -- 5. If workspace does not exist, atomically insert it
  IF v_workspace_id IS NULL THEN
    INSERT INTO public.workspaces (
      type,
      creator_id,
      owner_id,
      dm_participant_a,
      dm_participant_b,
      canonical_dm_key
    ) VALUES (
      'dm',
      v_current_user_id,
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

GRANT EXECUTE ON FUNCTION public.get_or_create_dm_workspace(UUID) TO authenticated, anon, service_role;


-- ----------------------------------------------------------------------------
-- 6. ATOMIC RPC: TOGGLE WORKSPACE MESSAGE REACTION
-- ----------------------------------------------------------------------------
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
  SELECT workspace_id, COALESCE(reactions, '{}'::jsonb)
  INTO v_workspace_id, v_current_reactions
  FROM public.workspace_messages
  WHERE id = p_message_id;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF NOT (public.is_workspace_member(v_workspace_id, auth.uid()) OR public.is_workspace_creator(v_workspace_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized to react to messages in this workspace';
  END IF;

  v_uid_str := auth.uid()::TEXT;
  v_user_list := COALESCE(v_current_reactions->p_emoji, '[]'::jsonb);

  IF v_user_list @> jsonb_build_array(v_uid_str) THEN
    SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
    INTO v_new_list
    FROM jsonb_array_elements_text(v_user_list) AS elem
    WHERE elem <> v_uid_str;
  ELSE
    v_new_list := v_user_list || jsonb_build_array(v_uid_str);
  END IF;

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

GRANT EXECUTE ON FUNCTION public.toggle_workspace_message_reaction(UUID, TEXT) TO authenticated, anon, service_role;


-- ----------------------------------------------------------------------------
-- 7. REAL-TIME SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.workspace_messages REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_members REPLICA IDENTITY FULL;
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspace_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspace_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspace_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'workspaces') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workspaces;
  END IF;
END $$;

-- Reload PostgREST API cache
NOTIFY pgrst, 'reload schema';
