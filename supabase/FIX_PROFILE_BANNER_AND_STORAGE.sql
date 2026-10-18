-- ============================================================================
-- BOOFFIN PLATFORM: FIX PROFILE BANNER, AVATAR & STORAGE BUCKET ACTIVATION
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/xdzrpsptamdhqomhvjsx/sql/new
--
-- This script:
--   1. Adds 'banner_url', 'has_custom_avatar', and 'has_custom_banner' to profiles
--   2. Creates and provisions the public 'profile-media' Supabase Storage bucket
--   3. Configures Row Level Security (RLS) policies for uploads, updates, and deletes
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD BANNER & AVATAR COLUMNS TO public.profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_custom_avatar BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_custom_banner BOOLEAN NOT NULL DEFAULT FALSE;

-- ----------------------------------------------------------------------------
-- 2. CREATE 'profile-media' STORAGE BUCKET
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  TRUE,
  5242880, -- 5 MB cap
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/aac', 'audio/ogg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/mpeg', 'audio/aac', 'audio/ogg', 'application/pdf'];

-- ----------------------------------------------------------------------------
-- 3. STORAGE ROW LEVEL SECURITY (RLS) POLICIES FOR 'profile-media'
-- ----------------------------------------------------------------------------

-- 3.1 Public Read Policy: anyone can view profile avatars, banners, and media
DROP POLICY IF EXISTS "Public Profile Media View" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Read Profile Media" ON storage.objects;
CREATE POLICY "Public Profile Media View"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'profile-media');

-- 3.2 User Upload Policy: authenticated users can upload to their own folder: {user_id}/*
DROP POLICY IF EXISTS "Users can upload their own profile media" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload Profile Media" ON storage.objects;
CREATE POLICY "Users can upload their own profile media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3.3 User Update Policy: authenticated users can update files in their own folder
DROP POLICY IF EXISTS "Users can update their own profile media" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Update Profile Media" ON storage.objects;
CREATE POLICY "Users can update their own profile media"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3.4 User Delete Policy: authenticated users can delete files in their own folder
DROP POLICY IF EXISTS "Users can delete their own profile media" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Delete Profile Media" ON storage.objects;
CREATE POLICY "Users can delete their own profile media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
