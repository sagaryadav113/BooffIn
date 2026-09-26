-- ============================================================================
-- BooffIn Profile Photo and Banner Media Storage Migration
-- Migration: 20260926000002_profile_media_storage.sql
-- Description:
--   1. Adds banner_url, has_custom_avatar, and has_custom_banner columns to public.profiles
--   2. Provisions 'profile-media' Supabase Storage bucket with 5MB limit and image MIME restrictions
--   3. Configures granular Storage RLS policies (authenticated user isolation)
--   4. Updates handle_new_user() trigger to protect custom avatars from Google OAuth overwrite
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD COLUMNS TO public.profiles
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
END $$;

-- ----------------------------------------------------------------------------
-- 2. CREATE STORAGE BUCKET: profile-media
-- ----------------------------------------------------------------------------
-- Insert bucket into storage.buckets if not already existing
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

-- ----------------------------------------------------------------------------
-- 3. STORAGE RLS POLICIES FOR profile-media BUCKET
-- ----------------------------------------------------------------------------

-- Enable RLS on storage.objects (standard Supabase default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3.1 Public Read Policy: Anyone can view researcher avatars and banners
DROP POLICY IF EXISTS "Public Profile Media View" ON storage.objects;
CREATE POLICY "Public Profile Media View"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-media');

-- 3.2 User Insert Policy: Authenticated users can upload to their own folder: {user_id}/*
DROP POLICY IF EXISTS "Users can upload their own profile media" ON storage.objects;
CREATE POLICY "Users can upload their own profile media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- 3.3 User Update Policy: Authenticated users can update files in their own folder
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

-- 3.4 User Delete Policy: Authenticated users can delete files in their own folder
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
-- 4. UPDATE handle_new_user() TRIGGER
-- Protect custom avatar and banner from automatic overwrite on OAuth reconnect
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_handle TEXT;
  base_handle TEXT;
  candidate_handle TEXT;
  user_full_name TEXT;
  user_avatar TEXT;
  user_academic_title TEXT;
  user_institution TEXT;
  collision_count INT := 0;
BEGIN
  -- Extract raw handle from metadata or email / phone
  raw_handle := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'handle',
    split_part(NEW.email, '@', 1),
    'researcher'
  );

  -- Clean to lowercase alphanumeric + underscore
  base_handle := LOWER(regexp_replace(raw_handle, '[^a-zA-Z0-9_]', '', 'g'));
  IF length(base_handle) < 3 THEN
    base_handle := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  -- Ensure handle is not reserved
  IF public.is_reserved_username(base_handle) THEN
    base_handle := base_handle || '_' || floor(random() * 900 + 100)::text;
  END IF;

  candidate_handle := base_handle;

  -- Collision resolution loop: ensure absolute uniqueness
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = candidate_handle
      AND id <> NEW.id
  ) LOOP
    collision_count := collision_count + 1;
    candidate_handle := substr(base_handle, 1, 23) || '_' || floor(random() * 9000 + 1000)::text;
    IF collision_count > 10 THEN
      candidate_handle := 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 12);
      EXIT;
    END IF;
  END LOOP;

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'Researcher'
  );

  user_avatar := NEW.raw_user_meta_data->>'avatar_url';
  user_academic_title := COALESCE(NEW.raw_user_meta_data->>'academic_title', 'Research Enthusiast');
  user_institution := COALESCE(NEW.raw_user_meta_data->>'institution', 'Independent');

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    academic_title,
    institution,
    orcid_id,
    orcid_verified,
    has_custom_avatar,
    has_custom_banner
  )
  VALUES (
    NEW.id,
    candidate_handle,
    user_full_name,
    user_avatar,
    user_academic_title,
    user_institution,
    NEW.raw_user_meta_data->>'orcid_id',
    COALESCE((NEW.raw_user_meta_data->>'orcid_verified')::boolean, FALSE),
    FALSE,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    -- Protect custom avatars: never overwrite if user set has_custom_avatar or already has an avatar
    avatar_url = CASE 
      WHEN profiles.has_custom_avatar = TRUE THEN profiles.avatar_url
      WHEN profiles.avatar_url IS NOT NULL AND profiles.avatar_url <> '' THEN profiles.avatar_url
      ELSE EXCLUDED.avatar_url
    END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
