-- ============================================================================
-- BOOFFIN — P0 SECURITY REMEDIATION MIGRATION
-- Migration: 20261002000001_p0_security_remediation.sql
-- Dependencies:
--   Requires: 20260925000005_user_settings.sql
--   (Must be applied in order after 20260925000005_user_settings.sql)
--
-- Description:
--   1. Strict dependency verification for public.user_settings and extended profile columns.
--   2. Atomic account deletion via SECURITY DEFINER RPC with non-swallowed storage cleanup.
--      Purges user storage objects and cascades removal of auth.users down to all dependent tables.
--   3. Fail-closed SECURITY DEFINER visibility resolution helper (get_user_profile_visibility).
--      Resolves user_settings.profile_visibility without depending on caller SELECT permissions.
--   4. Database-enforced profile privacy boundary via get_user_profile RPC.
--      Evaluates viewer authorization against fail-closed visibility helper
--      (public, registered, private) and masks protected fields at the DB level.
--   5. Strict RLS policy on public.profiles replacing permissive USING (true) policy,
--      preventing direct PostgREST table queries from bypassing the privacy boundary.
--   6. Secure public_profile_cards view WITH (security_invoker = true) for minimal
--      public author card projections.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. PREREQUISITE DEPENDENCY VERIFICATION & IDEMPOTENT BACKFILL
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_settings'
  ) THEN
    RAISE EXCEPTION 'Migration dependency failure: table public.user_settings must exist before applying 20261002000001_p0_security_remediation.sql. Apply 20260925000005_user_settings.sql first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'department'
  ) THEN
    RAISE EXCEPTION 'Migration dependency failure: column public.profiles.department must exist before applying 20261002000001_p0_security_remediation.sql. Apply 20260925000005_user_settings.sql first.';
  END IF;
END $$;

-- Idempotent backfill: ensure every existing profile has a corresponding user_settings row
INSERT INTO public.user_settings (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 1. ATOMIC ACCOUNT DELETION RPC (WITH NON-SWALLOWED STORAGE CLEANUP)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  -- Strict check: must have active, authenticated session
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: cannot delete account without active authentication.';
  END IF;

  -- A. Clean up user's storage objects in profile-media bucket
  -- If storage cleanup fails (e.g. permission issues or network errors), the exception
  -- is NOT swallowed. The transaction will roll back completely, ensuring the user's
  -- auth account is NOT deleted and preventing orphaned storage files.
  DELETE FROM storage.objects
  WHERE bucket_id = 'profile-media'
    AND (
      owner = v_uid
      OR (storage.foldername(name))[1] = v_uid::text
      OR name LIKE (v_uid::text || '/%')
    );

  -- B. Delete user from auth.users
  -- This triggers ON DELETE CASCADE down to:
  --   public.profiles (id -> auth.users.id ON DELETE CASCADE)
  --   public.user_settings (user_id -> auth.users.id ON DELETE CASCADE)
  --   and all child tables of public.profiles (posts, comments, likes, reposts,
  --   follows, bookmarks, notifications, collaboration_requests, user_blocks,
  --   reports, topic_follows).
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, storage, pg_temp;

-- Lock down execution: only authenticated users can invoke deletion on themselves
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. PRIVACY VISIBILITY HELPER (SECURITY DEFINER, FAIL-CLOSED)
-- ----------------------------------------------------------------------------
-- Securely resolves a user's profile_visibility from public.user_settings without
-- requiring the calling viewer to have direct SELECT permission on the target
-- user's user_settings record.
--
-- Security properties:
--   - Narrowly scoped: only returns the visibility enum ('public', 'registered', 'private').
--   - Fails closed: if user_settings row is missing, null, or invalid, returns 'private'.
--   - Fixed search_path: public, pg_temp (prevents search_path hijacking).
--   - STABLE: safe and performant for row-level security evaluations.
CREATE OR REPLACE FUNCTION public.get_user_profile_visibility(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_visibility TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'private';
  END IF;

  SELECT profile_visibility INTO v_visibility
  FROM public.user_settings
  WHERE user_id = p_user_id;

  -- Strict fail-closed check: if missing or invalid, default safely to 'private'
  IF v_visibility IS NULL OR v_visibility NOT IN ('public', 'registered', 'private') THEN
    RETURN 'private';
  END IF;

  RETURN v_visibility;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_user_profile_visibility(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_profile_visibility(UUID) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. PROFILES ROW-LEVEL PRIVACY ENFORCEMENT
-- ----------------------------------------------------------------------------
-- Replace permissive "Public Profiles Read" policy with privacy-aware RLS policy
-- ensuring that direct PostgREST queries (e.g., supabase.from('profiles').select('*'))
-- cannot read private or registered profiles unless authorized.
-- Uses fail-closed get_user_profile_visibility helper.

DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles privacy read policy" ON public.profiles;

CREATE POLICY "Profiles privacy read policy"
ON public.profiles
FOR SELECT
USING (
  -- 1. Profile Owner can always read their own full profile
  auth.uid() = id
  OR
  -- 2. Public profile: visible to any viewer (anon or authenticated)
  public.get_user_profile_visibility(id) = 'public'
  OR
  -- 3. Registered profile: visible to authenticated users only
  (
    public.get_user_profile_visibility(id) = 'registered'
    AND auth.role() = 'authenticated'
  )
  OR
  -- 4. Private profile: visible ONLY to approved/connected viewers (mutual follow or accepted collaboration)
  (
    public.get_user_profile_visibility(id) = 'private'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.collaboration_requests
        WHERE ((sender_id = auth.uid() AND recipient_id = profiles.id)
            OR (sender_id = profiles.id AND recipient_id = auth.uid()))
          AND status = 'accepted'
      )
      OR
      (
        EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = auth.uid() AND following_id = profiles.id
        )
        AND EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = profiles.id AND following_id = auth.uid()
        )
      )
    )
  )
);


-- ----------------------------------------------------------------------------
-- 4. DATABASE-ENFORCED PROFILE PRIVACY BOUNDARY RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_profile(
  p_user_id UUID DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
  v_is_authenticated BOOLEAN := (auth.role() = 'authenticated' AND v_viewer_id IS NOT NULL);
  v_target_profile public.profiles%ROWTYPE;
  v_visibility TEXT := 'private'; -- Fail-closed default
  v_is_owner BOOLEAN := FALSE;
  v_is_connected BOOLEAN := FALSE;
  v_can_access_full BOOLEAN := FALSE;
  v_is_following BOOLEAN := FALSE;
  v_res jsonb;
BEGIN
  -- A. Resolve target profile by UUID or normalized username
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_user_id;
  ELSIF p_username IS NOT NULL THEN
    SELECT * INTO v_target_profile FROM public.profiles WHERE LOWER(username) = LOWER(TRIM(p_username));
  ELSE
    RETURN NULL;
  END IF;

  IF v_target_profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- B. Determine viewer relationship to target profile
  IF v_viewer_id IS NOT NULL THEN
    v_is_owner := (v_viewer_id = v_target_profile.id);

    -- Check if viewer follows target
    SELECT EXISTS (
      SELECT 1 FROM public.follows
      WHERE follower_id = v_viewer_id AND following_id = v_target_profile.id
    ) INTO v_is_following;

    -- Check if mutual follow or accepted collaboration request exists
    IF NOT v_is_owner THEN
      SELECT EXISTS (
        SELECT 1 FROM public.collaboration_requests
        WHERE ((sender_id = v_viewer_id AND recipient_id = v_target_profile.id)
            OR (sender_id = v_target_profile.id AND recipient_id = v_viewer_id))
          AND status = 'accepted'
      ) OR (
        v_is_following AND EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = v_target_profile.id AND following_id = v_viewer_id
        )
      ) INTO v_is_connected;
    END IF;
  END IF;

  -- C. Read target's privacy settings via fail-closed helper
  v_visibility := public.get_user_profile_visibility(v_target_profile.id);

  -- D. Evaluate field access rights
  IF v_is_owner THEN
    v_can_access_full := TRUE;
  ELSIF v_visibility = 'public' THEN
    v_can_access_full := TRUE;
  ELSIF v_visibility = 'registered' THEN
    v_can_access_full := v_is_authenticated;
  ELSIF v_visibility = 'private' THEN
    v_can_access_full := v_is_connected;
  ELSE
    v_can_access_full := FALSE; -- Fail closed
  END IF;

  -- E. Construct secure JSON payload
  IF v_can_access_full THEN
    -- Full authorized profile access
    v_res := jsonb_build_object(
      'id', v_target_profile.id,
      'username', v_target_profile.username,
      'full_name', v_target_profile.full_name,
      'avatar_url', v_target_profile.avatar_url,
      'banner_url', v_target_profile.banner_url,
      'has_custom_avatar', v_target_profile.has_custom_avatar,
      'has_custom_banner', v_target_profile.has_custom_banner,
      'academic_title', v_target_profile.academic_title,
      'institution', v_target_profile.institution,
      'bio', v_target_profile.bio,
      'location', v_target_profile.location,
      'country', v_target_profile.country,
      'orcid_id', v_target_profile.orcid_id,
      'orcid_verified', v_target_profile.orcid_verified,
      'website_url', v_target_profile.website_url,
      'department', v_target_profile.department,
      'lab_group', v_target_profile.lab_group,
      'primary_field', v_target_profile.primary_field,
      'secondary_fields', to_jsonb(v_target_profile.secondary_fields),
      'degree_program', v_target_profile.degree_program,
      'graduation_year', v_target_profile.graduation_year,
      'google_scholar_url', v_target_profile.google_scholar_url,
      'researchgate_url', v_target_profile.researchgate_url,
      'linkedin_url', v_target_profile.linkedin_url,
      'scopus_id', v_target_profile.scopus_id,
      'research_interests', to_jsonb(v_target_profile.research_interests),
      'followers_count', v_target_profile.followers_count,
      'following_count', v_target_profile.following_count,
      'posts_count', v_target_profile.posts_count,
      'saved_count', v_target_profile.saved_count,
      'created_at', v_target_profile.created_at,
      'is_following', v_is_following,
      'is_private_restricted', FALSE,
      'visibility_level', v_visibility
    );
  ELSE
    -- Restricted access: expose only minimal public discovery identity
    -- All sensitive/extended bio and academic fields are masked as NULL at DB boundary
    v_res := jsonb_build_object(
      'id', v_target_profile.id,
      'username', v_target_profile.username,
      'full_name', v_target_profile.full_name,
      'avatar_url', v_target_profile.avatar_url,
      'banner_url', v_target_profile.banner_url,
      'has_custom_avatar', v_target_profile.has_custom_avatar,
      'has_custom_banner', v_target_profile.has_custom_banner,
      'academic_title', v_target_profile.academic_title,
      'institution', v_target_profile.institution,
      'bio', NULL,
      'location', NULL,
      'country', NULL,
      'orcid_id', v_target_profile.orcid_id,
      'orcid_verified', v_target_profile.orcid_verified,
      'website_url', NULL,
      'department', NULL,
      'lab_group', NULL,
      'primary_field', NULL,
      'secondary_fields', '[]'::jsonb,
      'degree_program', NULL,
      'graduation_year', NULL,
      'google_scholar_url', NULL,
      'researchgate_url', NULL,
      'linkedin_url', NULL,
      'scopus_id', NULL,
      'research_interests', '[]'::jsonb,
      'followers_count', v_target_profile.followers_count,
      'following_count', v_target_profile.following_count,
      'posts_count', v_target_profile.posts_count,
      'saved_count', 0,
      'created_at', v_target_profile.created_at,
      'is_following', v_is_following,
      'is_private_restricted', (v_visibility = 'private'),
      'is_registered_restricted', (v_visibility = 'registered' AND NOT v_is_authenticated),
      'visibility_level', v_visibility
    );
  END IF;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

-- Both anonymous and authenticated callers may call get_user_profile
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID, TEXT) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. SECURE PUBLIC PROFILE CARDS VIEW (SECURITY INVOKER)
-- ----------------------------------------------------------------------------
-- Safe projection view for legitimate public card discovery
-- Excludes all sensitive fields (bio, location, country, website, research interests, etc.)
-- Explicitly specifies security_invoker = true so that it respects the caller's identity
-- and is filtered by public.profiles RLS policies (preventing private profile leakage).
CREATE OR REPLACE VIEW public.public_profile_cards
WITH (security_invoker = true) AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  academic_title,
  institution,
  orcid_verified
FROM public.profiles;

GRANT SELECT ON public.public_profile_cards TO anon, authenticated;
