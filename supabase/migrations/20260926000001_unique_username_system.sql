-- ============================================================================
-- BooffIn Production Unique Username System Migration
-- Migration: 20260926000001_unique_username_system.sql
-- Description:
--   1. Normalizes and deduplicates existing usernames safely
--   2. Enforces case-insensitive uniqueness at the database level
--   3. Enforces lowercase format constraint (^[a-z0-9_]{3,30}$)
--   4. Enforces reserved username restrictions
--   5. Upgrades handle_new_user() trigger with collision-proof fallback
--   6. Exposes secure check_username_available() RPC for client preflight
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DEDUPLICATE & NORMALIZE EXISTING PROFILES USERNAMES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  clean_un TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  -- First pass: Clean and lowercase existing usernames
  FOR rec IN (
    SELECT id, username, created_at,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(regexp_replace(TRIM(username), '[^a-zA-Z0-9_]', '', 'g'))
             ORDER BY created_at ASC
           ) as row_num
    FROM public.profiles
  ) LOOP
    clean_un := LOWER(regexp_replace(TRIM(rec.username), '[^a-zA-Z0-9_]', '', 'g'));
    IF length(clean_un) < 3 THEN
      clean_un := 'user_' || substr(replace(rec.id::text, '-', ''), 1, 8);
    END IF;

    IF rec.row_num > 1 THEN
      -- Suffix colliding subsequent accounts
      candidate := substr(clean_un, 1, 24) || '_' || rec.row_num::text;
      UPDATE public.profiles SET username = candidate WHERE id = rec.id;
    ELSE
      UPDATE public.profiles SET username = clean_un WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. RESERVED USERNAMES CHECK FUNCTION & CONSTRAINT
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_reserved_username(un TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF un IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN LOWER(TRIM(un)) IN (
    'admin', 'administrator', 'booffin', 'boffin', 'support', 'help',
    'moderator', 'mod', 'staff', 'security', 'system', 'root', 'api',
    'auth', 'explore', 'feed', 'profile', 'search', 'settings', 'paper',
    'papers', 'post', 'posts', 'topic', 'topics', 'notifications', 'login',
    'signup', 'welcome', 'terms', 'privacy', 'about', 'contact', 'careers',
    'app', 'dev', 'developer', 'staging', 'production', 'status', 'bot'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop old check constraint and add strict lowercase alphanumeric constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_username_format;
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_format 
  CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- Enforce reserved handle constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_username_not_reserved;
ALTER TABLE public.profiles ADD CONSTRAINT chk_username_not_reserved 
  CHECK (NOT public.is_reserved_username(username));

-- ----------------------------------------------------------------------------
-- 3. UNIQUE INDEXES & SEARCH ACCELERATION
-- ----------------------------------------------------------------------------
-- Ensure case-insensitive uniqueness index
DROP INDEX IF EXISTS public.idx_profiles_username_lower;
CREATE UNIQUE INDEX idx_profiles_username_lower ON public.profiles(LOWER(username));

-- Trigram fuzzy search index for researcher discovery
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin(username gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 4. COLLISION-PROOF AUTH SIGNUP TRIGGER (handle_new_user)
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
    orcid_verified
  )
  VALUES (
    NEW.id,
    candidate_handle,
    user_full_name,
    user_avatar,
    user_academic_title,
    user_institution,
    NEW.raw_user_meta_data->>'orcid_id',
    COALESCE((NEW.raw_user_meta_data->>'orcid_verified')::boolean, FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rebind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. RPC FUNCTION: check_username_available
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_username_available(
  requested_username TEXT,
  for_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  normalized TEXT;
  is_reserved BOOLEAN;
  is_taken BOOLEAN;
BEGIN
  IF requested_username IS NULL OR TRIM(requested_username) = '' THEN
    RETURN jsonb_build_object(
      'available', false,
      'normalized', '',
      'reason', 'empty',
      'message', 'Please provide a researcher handle.'
    );
  END IF;

  -- Normalize: trim, remove leading @, lowercase
  normalized := LOWER(TRIM(regexp_replace(requested_username, '^@+', '')));

  -- Format validation
  IF normalized !~ '^[a-z0-9_]{3,30}$' THEN
    RETURN jsonb_build_object(
      'available', false,
      'normalized', normalized,
      'reason', 'format_invalid',
      'message', 'Handles must be 3-30 characters and contain only letters, numbers, and underscores.'
    );
  END IF;

  -- Reserved check
  IF public.is_reserved_username(normalized) THEN
    RETURN jsonb_build_object(
      'available', false,
      'normalized', normalized,
      'reason', 'reserved',
      'message', 'This handle is reserved by BooffIn.'
    );
  END IF;

  -- Existence check
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = normalized
      AND (for_user_id IS NULL OR id <> for_user_id)
  ) INTO is_taken;

  IF is_taken THEN
    RETURN jsonb_build_object(
      'available', false,
      'normalized', normalized,
      'reason', 'taken',
      'message', 'This handle is already taken by another researcher.'
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'normalized', normalized,
    'reason', null,
    'message', 'Handle is available.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
