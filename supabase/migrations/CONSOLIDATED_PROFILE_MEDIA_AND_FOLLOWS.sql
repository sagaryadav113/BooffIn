-- ============================================================================
-- BOOFFIN COMPLETE SETUP: PROFILE MEDIA (DP + BANNER) & FOLLOW/CONNECTION SYSTEM
-- Run this script in the Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD PROFILE MEDIA COLUMNS TO public.profiles
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

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Storage Read Policy (Public access)
DROP POLICY IF EXISTS "Public Profile Media View" ON storage.objects;
CREATE POLICY "Public Profile Media View"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-media');

-- Storage Insert Policy (Authenticated user own folder {user_id}/*)
DROP POLICY IF EXISTS "Users can upload their own profile media" ON storage.objects;
CREATE POLICY "Users can upload their own profile media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Storage Update Policy
DROP POLICY IF EXISTS "Users can update their own profile media" ON storage.objects;
CREATE POLICY "Users can update their own profile media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Storage Delete Policy
DROP POLICY IF EXISTS "Users can delete their own profile media" ON storage.objects;
CREATE POLICY "Users can delete their own profile media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

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
-- 5. ATOMIC TOGGLE FOLLOW RPC FUNCTION
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

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target researcher not found.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = target_user_id
  ) INTO v_already_following;

  IF v_already_following THEN
    DELETE FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = target_user_id;
    v_is_following := FALSE;
  ELSE
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_caller_id, target_user_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    v_is_following := TRUE;
  END IF;

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
-- 6. GET USER FOLLOWING IDS RPC FUNCTION
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
-- 7. GET FOLLOWERS WITH VIEWER FOLLOW STATUS RPC FUNCTION
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
-- 8. GET FOLLOWING WITH VIEWER FOLLOW STATUS RPC FUNCTION
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
