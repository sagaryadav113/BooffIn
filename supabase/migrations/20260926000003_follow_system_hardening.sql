-- ============================================================================
-- BooffIn Follow & Connection System Hardening Migration
-- Migration: 20260926000003_follow_system_hardening.sql
-- Description:
--   1. Ensures follows table integrity (PK, self-follow check, cascade foreign keys)
--   2. Enforces strict RLS policies on public.follows
--   3. Provides atomic, race-condition-safe RPC toggle_follow()
--   4. Provides get_followers() and get_following() RPC functions with viewer follow status
--   5. Provides get_user_following_ids() for instant client state synchronization
--   6. Ensures count triggers accurately update follower_count and following_count
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLE INTEGRITY & CONSTRAINTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

-- Ensure self-follow check constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_follow'
  ) THEN
    ALTER TABLE public.follows ADD CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id);
  END IF;
END $$;

-- Indexes for high-performance follower/following queries
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. RLS POLICIES FOR public.follows
-- ----------------------------------------------------------------------------
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Follows Read" ON public.follows;
CREATE POLICY "Public Follows Read"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users Insert Own Follows" ON public.follows;
CREATE POLICY "Users Insert Own Follows"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = follower_id AND
    follower_id <> following_id
  );

DROP POLICY IF EXISTS "Users Delete Own Follows" ON public.follows;
CREATE POLICY "Users Delete Own Follows"
  ON public.follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- ----------------------------------------------------------------------------
-- 3. COUNT SYNC TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles 
    SET following_count = (SELECT count(*) FROM public.follows WHERE follower_id = NEW.follower_id),
        updated_at = now()
    WHERE id = NEW.follower_id;

    UPDATE public.profiles 
    SET followers_count = (SELECT count(*) FROM public.follows WHERE following_id = NEW.following_id),
        updated_at = now()
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET following_count = (SELECT count(*) FROM public.follows WHERE follower_id = OLD.follower_id),
        updated_at = now()
    WHERE id = OLD.follower_id;

    UPDATE public.profiles 
    SET followers_count = (SELECT count(*) FROM public.follows WHERE following_id = OLD.following_id),
        updated_at = now()
    WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_follow_count ON public.follows;
CREATE TRIGGER trg_follow_count
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_follow_count();

-- ----------------------------------------------------------------------------
-- 4. ATOMIC TOGGLE FOLLOW RPC FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_already_following BOOLEAN;
  v_is_following BOOLEAN;
  v_followers_count INT;
  v_following_count INT;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to follow users.';
  END IF;

  IF v_caller_id = target_user_id THEN
    RAISE EXCEPTION 'Users cannot follow themselves.';
  END IF;

  -- Check if target user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target researcher not found.';
  END IF;

  -- Check existing follow status
  SELECT EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = target_user_id
  ) INTO v_already_following;

  IF v_already_following THEN
    -- UNFOLLOW
    DELETE FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = target_user_id;
    v_is_following := FALSE;
  ELSE
    -- FOLLOW
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_caller_id, target_user_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    v_is_following := TRUE;
  END IF;

  -- Retrieve exact current counts
  SELECT count(*) INTO v_followers_count FROM public.follows WHERE following_id = target_user_id;
  SELECT count(*) INTO v_following_count FROM public.follows WHERE follower_id = v_caller_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_following', v_is_following,
    'target_user_id', target_user_id,
    'target_followers_count', v_followers_count,
    'caller_following_count', v_following_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. GET USER FOLLOWING IDS (FAST INITIALIZATION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_following_ids(p_user_id UUID)
RETURNS UUID[] AS $$
DECLARE
  v_ids UUID[];
BEGIN
  SELECT COALESCE(array_agg(following_id), ARRAY[]::UUID[])
  INTO v_ids
  FROM public.follows
  WHERE follower_id = p_user_id;

  RETURN v_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. GET FOLLOWERS WITH VIEWER FOLLOW STATUS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_followers(
  p_user_id UUID,
  p_viewer_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'banner_url', p.banner_url,
        'academic_title', p.academic_title,
        'institution', p.institution,
        'bio', p.bio,
        'orcid_id', p.orcid_id,
        'orcid_verified', p.orcid_verified,
        'followers_count', p.followers_count,
        'following_count', p.following_count,
        'posts_count', p.posts_count,
        'created_at', p.created_at,
        'is_following', CASE 
          WHEN p_viewer_id IS NOT NULL THEN
            EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p.id)
          ELSE FALSE
        END
      ) ORDER BY f.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.following_id = p_user_id
  LIMIT p_limit OFFSET p_offset;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. GET FOLLOWING WITH VIEWER FOLLOW STATUS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_following(
  p_user_id UUID,
  p_viewer_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'banner_url', p.banner_url,
        'academic_title', p.academic_title,
        'institution', p.institution,
        'bio', p.bio,
        'orcid_id', p.orcid_id,
        'orcid_verified', p.orcid_verified,
        'followers_count', p.followers_count,
        'following_count', p.following_count,
        'posts_count', p.posts_count,
        'created_at', p.created_at,
        'is_following', CASE 
          WHEN p_viewer_id IS NOT NULL THEN
            EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_viewer_id AND following_id = p.id)
          ELSE FALSE
        END
      ) ORDER BY f.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.following_id
  WHERE f.follower_id = p_user_id
  LIMIT p_limit OFFSET p_offset;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
