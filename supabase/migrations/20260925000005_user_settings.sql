-- ============================================================================
-- BooffIn Settings System & Research Profile Migration
-- File: 20260925000005_user_settings.sql
-- Description: Non-destructive additive migration for:
--   1. Extended research profile metadata in public.profiles
--   2. Dedicated user_settings table with full RLS
--   3. Auto-initialization trigger for newly created users
-- ============================================================================

-- 1. ADD EXTENDED RESEARCH PROFILE FIELDS TO public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS lab_group TEXT,
  ADD COLUMN IF NOT EXISTS primary_field TEXT,
  ADD COLUMN IF NOT EXISTS secondary_fields TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS degree_program TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
  ADD COLUMN IF NOT EXISTS google_scholar_url TEXT,
  ADD COLUMN IF NOT EXISTS researchgate_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS scopus_id TEXT;

-- 2. CREATE public.user_settings TABLE
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

-- Refresher trigger on updated_at
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. ROW LEVEL SECURITY (RLS) FOR user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. FUNCTION & TRIGGER TO AUTO-INITIALIZE SETTINGS ON NEW PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_init_user_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();
