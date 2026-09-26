-- ============================================================================
-- BOOFFIN COMPLETE SETUP: PROFILE MEDIA (DP + BANNER) & FOLLOW/CONNECTION SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD PROFILE MEDIA & FOLLOWER COLUMNS TO public.profiles
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN banner_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'has_custom_avatar'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN has_custom_avatar BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'has_custom_banner'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN has_custom_banner BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN following_count INT NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN followers_count INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CREATE STORAGE BUCKET: profile-media
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'profile-media',
    'profile-media',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Notice: profile-media bucket can also be managed via Storage dashboard.';
END $$;

-- ----------------------------------------------------------------------------
-- 3. FOLLOWS TABLE & CONSTRAINTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_follow'
  ) THEN
    ALTER TABLE public.follows ADD CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON public.follows(created_at DESC);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Follows Read" ON public.follows;
CREATE POLICY "Public Follows Read"
  ON public.follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users Insert Own Follows" ON public.follows;
CREATE POLICY "Users Insert Own Follows"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = follower_id AND
    follower_id <> following_id
  );

DROP POLICY IF EXISTS "Users Delete Own Follows" ON public.follows;
CREATE POLICY "Users Delete Own Follows"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ----------------------------------------------------------------------------
-- 4. FOLLOW COUNT TRIGGER
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
-- 5. ATOMIC TOGGLE FOLLOW RPC FUNCTION (Accepts UUID or Username/Text)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_target_uuid UUID;
  v_already_following BOOLEAN;
  v_is_following BOOLEAN;
  v_followers_count INT;
  v_following_count INT;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to follow users.';
  END IF;

  -- Resolve target UUID whether passed as UUID string or username
  IF target_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_target_uuid := target_user_id::UUID;
  ELSE
    SELECT id INTO v_target_uuid 
    FROM public.profiles 
    WHERE lower(username) = lower(replace(target_user_id, '@', ''))
    LIMIT 1;
  END IF;

  IF v_target_uuid IS NULL THEN
    RAISE EXCEPTION 'Target researcher not found.';
  END IF;

  IF v_caller_id = v_target_uuid THEN
    RAISE EXCEPTION 'Users cannot follow themselves.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = v_target_uuid
  ) INTO v_already_following;

  IF v_already_following THEN
    DELETE FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = v_target_uuid;
    v_is_following := FALSE;
  ELSE
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_caller_id, v_target_uuid)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    v_is_following := TRUE;
  END IF;

  SELECT count(*) INTO v_followers_count FROM public.follows WHERE following_id = v_target_uuid;
  SELECT count(*) INTO v_following_count FROM public.follows WHERE follower_id = v_caller_id;

  -- Direct count update for immediate consistency
  UPDATE public.profiles SET followers_count = v_followers_count, updated_at = now() WHERE id = v_target_uuid;
  UPDATE public.profiles SET following_count = v_following_count, updated_at = now() WHERE id = v_caller_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_following', v_is_following,
    'target_user_id', v_target_uuid,
    'target_followers_count', v_followers_count,
    'caller_following_count', v_following_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 6. GET USER FOLLOWING IDS RPC FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_following_ids(p_user_id TEXT)
RETURNS UUID[] AS $$
DECLARE
  v_target_uuid UUID;
  v_ids UUID[];
BEGIN
  IF p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_target_uuid := p_user_id::UUID;
  ELSE
    SELECT id INTO v_target_uuid FROM public.profiles WHERE lower(username) = lower(replace(p_user_id, '@', '')) LIMIT 1;
  END IF;

  IF v_target_uuid IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  SELECT COALESCE(array_agg(following_id), ARRAY[]::UUID[])
  INTO v_ids
  FROM public.follows
  WHERE follower_id = v_target_uuid;

  RETURN v_ids;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 7. GET FOLLOWERS WITH VIEWER FOLLOW STATUS RPC FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_followers(
  p_user_id TEXT,
  p_viewer_id TEXT DEFAULT NULL,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_target_uuid UUID;
  v_viewer_uuid UUID;
  v_result JSONB;
BEGIN
  IF p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_target_uuid := p_user_id::UUID;
  ELSE
    SELECT id INTO v_target_uuid FROM public.profiles WHERE lower(username) = lower(replace(p_user_id, '@', '')) LIMIT 1;
  END IF;

  IF p_viewer_id IS NOT NULL AND p_viewer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_viewer_uuid := p_viewer_id::UUID;
  END IF;

  IF v_target_uuid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

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
          WHEN v_viewer_uuid IS NOT NULL THEN
            EXISTS (SELECT 1 FROM public.follows WHERE follower_id = v_viewer_uuid AND following_id = p.id)
          ELSE FALSE
        END
      ) ORDER BY f.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.follower_id
  WHERE f.following_id = v_target_uuid
  LIMIT p_limit OFFSET p_offset;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 8. GET FOLLOWING WITH VIEWER FOLLOW STATUS RPC FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_following(
  p_user_id TEXT,
  p_viewer_id TEXT DEFAULT NULL,
  p_limit INT DEFAULT 30,
  p_offset INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_target_uuid UUID;
  v_viewer_uuid UUID;
  v_result JSONB;
BEGIN
  IF p_user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_target_uuid := p_user_id::UUID;
  ELSE
    SELECT id INTO v_target_uuid FROM public.profiles WHERE lower(username) = lower(replace(p_user_id, '@', '')) LIMIT 1;
  END IF;

  IF p_viewer_id IS NOT NULL AND p_viewer_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_viewer_uuid := p_viewer_id::UUID;
  END IF;

  IF v_target_uuid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

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
          WHEN v_viewer_uuid IS NOT NULL THEN
            EXISTS (SELECT 1 FROM public.follows WHERE follower_id = v_viewer_uuid AND following_id = p.id)
          ELSE FALSE
        END
      ) ORDER BY f.created_at DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM public.follows f
  JOIN public.profiles p ON p.id = f.following_id
  WHERE f.follower_id = v_target_uuid
  LIMIT p_limit OFFSET p_offset;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
