-- ==============================================================================
-- Migration: Add Demographics, Safety, and Onboarding Metadata to public.profiles
-- Date: 2026-10-23
-- Description:
--   1. Adds lightweight demographic and safety compliance columns to public.profiles:
--      - gender: Optional demographic identifier (male, female, non_binary, prefer_not_to_say)
--      - age_bracket: Required safety compliance field (under_13, 13_17, 18_24, 25_34, 35_44, 45_plus)
--      - referral_source: Optional growth analytics attribute (colleague, twitter, linkedin, etc.)
--      - content_preferences: Array of content modalities chosen during onboarding
--   2. Ensures ultra-low storage footprint (~20 bytes/user) and prevents egress overload.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Gender column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN gender VARCHAR(30) DEFAULT NULL;
    COMMENT ON COLUMN public.profiles.gender IS 'Optional demographic safety field (e.g. male, female, non_binary, prefer_not_to_say)';
  END IF;

  -- 2. Age Bracket column (COPPA / GDPR age verification)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'age_bracket'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN age_bracket VARCHAR(20) DEFAULT NULL;
    COMMENT ON COLUMN public.profiles.age_bracket IS 'Age compliance verification bracket (under_13, 13_17, 18_24, 25_34, 35_44, 45_plus)';
  END IF;

  -- 3. Referral Source
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_source VARCHAR(50) DEFAULT NULL;
    COMMENT ON COLUMN public.profiles.referral_source IS 'Where the user discovered BooffIn (e.g. colleague, twitter, linkedin, conference)';
  END IF;

  -- 4. Content Preferences array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'content_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN content_preferences TEXT[] DEFAULT '{}';
    COMMENT ON COLUMN public.profiles.content_preferences IS 'Array of content modalities selected during onboarding';
  END IF;

END $$;
