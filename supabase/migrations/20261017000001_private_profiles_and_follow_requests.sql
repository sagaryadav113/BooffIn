-- ============================================================================
-- BOOFFIN — PRIVATE PROFILES & FOLLOW REQUESTS MIGRATION
-- Migration: 20261017000001_private_profiles_and_follow_requests.sql
-- Description:
--   1. Ensures 'is_private' and 'visibility_level' exist on public.profiles
--   2. Creates 'follow_requests' table with RLS policies and indexing
--   3. Updates notification_type check constraint to support follow_request & follow_accept
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD VISIBILITY COLUMNS TO PROFILES (IF NOT EXISTS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visibility_level TEXT DEFAULT 'public' CHECK (visibility_level IN ('public', 'registered', 'private'));

-- ----------------------------------------------------------------------------
-- 2. CREATE FOLLOW_REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_no_self_follow_request CHECK (requester_id <> target_id),
  CONSTRAINT uq_active_follow_request UNIQUE (requester_id, target_id)
);

-- Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester 
  ON public.follow_requests(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_follow_requests_target 
  ON public.follow_requests(target_id, status);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) FOR FOLLOW_REQUESTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their sent or received follow requests" ON public.follow_requests;
CREATE POLICY "Users can view their sent or received follow requests"
  ON public.follow_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can create follow requests" ON public.follow_requests;
CREATE POLICY "Users can create follow requests"
  ON public.follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update their follow requests" ON public.follow_requests;
CREATE POLICY "Users can update their follow requests"
  ON public.follow_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = target_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can delete their follow requests" ON public.follow_requests;
CREATE POLICY "Users can delete their follow requests"
  ON public.follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ----------------------------------------------------------------------------
-- 4. UPDATE NOTIFICATIONS CHECK CONSTRAINT
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'follow',
    'follow_request',
    'follow_accept',
    'like',
    'comment',
    'reply',
    'repost',
    'paper_discussion',
    'collaboration_request',
    'researcher_post',
    'topic_activity',
    'mention',
    'paper_share',
    'topic_update',
    'trending',
    'publisher_update',
    'workspace_invitation',
    'workspace_message',
    'workspace_event',
    'workspace_block',
    'subscription_active',
    'system'
  ));
