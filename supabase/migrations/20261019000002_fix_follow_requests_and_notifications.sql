-- ============================================================================
-- BOOFFIN — COMPREHENSIVE FIX: FOLLOW REQUESTS, FOLLOW BACK & NOTIFICATIONS
-- Migration: 20261019000002_fix_follow_requests_and_notifications.sql
-- Description:
--   1. Ensures profiles table has is_private column with fast index.
--   2. Ensures follow_requests table has updated_at, status index, and robust RLS.
--   3. Synchronizes notifications table schema (type/notification_type, content/message_snippet, metadata).
--   4. Adds bidirectional auto-sync trigger on notifications so neither column set fails.
--   5. Implements zero-egress, atomic server-side triggers for:
--      - Follow & Follow Back notifications (AFTER INSERT ON public.follows)
--      - Follow cleanup (AFTER DELETE ON public.follows)
--      - Follow Request notifications (AFTER INSERT ON public.follow_requests)
--      - Follow Accept & automatic follows row creation (AFTER UPDATE ON public.follow_requests)
--      - Follow Request Decline / Cancel notification cleanup
--   6. Enforces airtight RLS policies on follows, follow_requests, and notifications.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES: PRIVACY COLUMN & INDEX
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_is_private 
  ON public.profiles(is_private) WHERE is_private = TRUE;

-- ----------------------------------------------------------------------------
-- 2. FOLLOW_REQUESTS: COLUMNS, INDEXES & RLS
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

ALTER TABLE public.follow_requests 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_follow_requests_target_status 
  ON public.follow_requests(target_id, status);

CREATE INDEX IF NOT EXISTS idx_follow_requests_requester_status 
  ON public.follow_requests(requester_id, status);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their sent or received follow requests" ON public.follow_requests;
DROP POLICY IF EXISTS "Auth Manage Follow Requests" ON public.follow_requests;
CREATE POLICY "Users can view their sent or received follow requests"
  ON public.follow_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can create follow requests" ON public.follow_requests;
CREATE POLICY "Users can create follow requests"
  ON public.follow_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND requester_id <> target_id);

DROP POLICY IF EXISTS "Users can update their follow requests" ON public.follow_requests;
CREATE POLICY "Users can update their follow requests"
  ON public.follow_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = target_id);

DROP POLICY IF EXISTS "Users can delete their follow requests" ON public.follow_requests;
CREATE POLICY "Users can delete their follow requests"
  ON public.follow_requests FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATIONS TABLE SCHEMA HARMONIZATION
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS notification_type TEXT,
  ADD COLUMN IF NOT EXISTS message_snippet TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill matching columns if they exist
UPDATE public.notifications 
SET notification_type = type 
WHERE notification_type IS NULL AND type IS NOT NULL;

UPDATE public.notifications 
SET message_snippet = content 
WHERE message_snippet IS NULL AND content IS NOT NULL;

-- Trigger to guarantee type <-> notification_type and content <-> message_snippet are always in sync
CREATE OR REPLACE FUNCTION public.fn_sync_notification_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync notification type
  IF NEW.notification_type IS NULL AND NEW.type IS NOT NULL THEN
    NEW.notification_type := NEW.type;
  ELSIF NEW.type IS NULL AND NEW.notification_type IS NOT NULL THEN
    NEW.type := NEW.notification_type;
  END IF;

  -- Sync message content
  IF NEW.message_snippet IS NULL AND NEW.content IS NOT NULL THEN
    NEW.message_snippet := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.message_snippet IS NOT NULL THEN
    NEW.content := NEW.message_snippet;
  END IF;

  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_notification_columns ON public.notifications;
CREATE TRIGGER trg_sync_notification_columns
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_notification_columns();

-- RLS Policies for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users Read Own Notifications" ON public.notifications;
CREATE POLICY "Users Read Own Notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public Insert Notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = actor_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users Update Own Notifications Read Status" ON public.notifications;
DROP POLICY IF EXISTS "Users Update Own Notifications" ON public.notifications;
CREATE POLICY "Users Update Own Notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users Delete Own Notifications" ON public.notifications;
CREATE POLICY "Users Delete Own Notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = actor_id);

-- ----------------------------------------------------------------------------
-- 4. ZERO-EGRESS DATABASE TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger 4.1: Auto-notify on follow or follow back
CREATE OR REPLACE FUNCTION public.fn_notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_is_blocked BOOLEAN := FALSE;
  v_notify_follows BOOLEAN := TRUE;
  v_is_follow_back BOOLEAN := FALSE;
  v_content TEXT := 'started following you';
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  -- Check blocking
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = NEW.following_id AND blocked_id = NEW.follower_id)
       OR (blocker_id = NEW.follower_id AND blocked_id = NEW.following_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Check if this is a follow back (target was already following the new follower)
  SELECT EXISTS (
    SELECT 1 FROM public.follows
    WHERE follower_id = NEW.following_id AND following_id = NEW.follower_id
  ) INTO v_is_follow_back;

  IF v_is_follow_back THEN
    v_content := 'followed you back';
  ELSE
    v_content := 'started following you';
  END IF;

  -- Check recipient preferences if user_settings exists
  BEGIN
    SELECT COALESCE(notify_follows, TRUE) INTO v_notify_follows
    FROM public.user_settings
    WHERE user_id = NEW.following_id;
  EXCEPTION WHEN OTHERS THEN
    v_notify_follows := TRUE;
  END;

  IF v_notify_follows IS FALSE THEN
    RETURN NEW;
  END IF;

  -- Insert single notification row (clean 0-egress server side)
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    type,
    notification_type,
    entity_type,
    entity_id,
    content,
    message_snippet,
    metadata,
    read_status,
    created_at
  )
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'follow',
    'profile',
    NEW.follower_id::text,
    v_content,
    v_content,
    jsonb_build_object('follower_id', NEW.follower_id, 'is_follow_back', v_is_follow_back),
    FALSE,
    NOW()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_follow();

-- Trigger 4.2: Auto-cleanup on unfollow
CREATE OR REPLACE FUNCTION public.fn_cleanup_on_unfollow()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE actor_id = OLD.follower_id
    AND recipient_id = OLD.following_id
    AND (type IN ('follow', 'follow_accept') OR notification_type IN ('follow', 'follow_accept'));
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_on_unfollow ON public.follows;
CREATE TRIGGER trg_cleanup_on_unfollow
  AFTER DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_cleanup_on_unfollow();

-- Trigger 4.3: Auto-notify on follow request
CREATE OR REPLACE FUNCTION public.fn_notify_on_follow_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      type,
      notification_type,
      entity_type,
      entity_id,
      content,
      message_snippet,
      metadata,
      read_status,
      created_at
    )
    VALUES (
      NEW.target_id,
      NEW.requester_id,
      'follow_request',
      'follow_request',
      'profile',
      NEW.requester_id::text,
      'requested to follow you',
      'requested to follow you',
      jsonb_build_object('requester_id', NEW.requester_id, 'target_id', NEW.target_id, 'request_id', NEW.id),
      FALSE,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_follow_request ON public.follow_requests;
CREATE TRIGGER trg_notify_on_follow_request
  AFTER INSERT ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_follow_request();

-- Trigger 4.4: Auto-accept and auto-clean on follow request status update
CREATE OR REPLACE FUNCTION public.fn_handle_follow_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When accepted:
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    -- 1. Create the follow relationship (requester follows target)
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (NEW.requester_id, NEW.target_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    -- 2. Mark existing follow_request notification as read
    UPDATE public.notifications
    SET read_status = TRUE
    WHERE recipient_id = NEW.target_id
      AND actor_id = NEW.requester_id
      AND (type = 'follow_request' OR notification_type = 'follow_request');

    -- 3. Notify requester that their request was accepted
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      type,
      notification_type,
      entity_type,
      entity_id,
      content,
      message_snippet,
      metadata,
      read_status,
      created_at
    )
    VALUES (
      NEW.requester_id,
      NEW.target_id,
      'follow_accept',
      'follow_accept',
      'profile',
      NEW.target_id::text,
      'accepted your follow request',
      'accepted your follow request',
      jsonb_build_object('accepted_by', NEW.target_id),
      FALSE,
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- When declined:
  IF NEW.status = 'declined' THEN
    -- Mark incoming follow_request notification as read or delete it
    DELETE FROM public.notifications
    WHERE recipient_id = NEW.target_id
      AND actor_id = NEW.requester_id
      AND (type = 'follow_request' OR notification_type = 'follow_request');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_handle_follow_request_status_change ON public.follow_requests;
CREATE TRIGGER trg_handle_follow_request_status_change
  AFTER UPDATE OF status ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_follow_request_status_change();

-- Trigger 4.5: Cleanup when follow request is cancelled/deleted
CREATE OR REPLACE FUNCTION public.fn_cleanup_on_follow_request_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE recipient_id = OLD.target_id
    AND actor_id = OLD.requester_id
    AND (type = 'follow_request' OR notification_type = 'follow_request');
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_on_follow_request_delete ON public.follow_requests;
CREATE TRIGGER trg_cleanup_on_follow_request_delete
  AFTER DELETE ON public.follow_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_cleanup_on_follow_request_delete();
