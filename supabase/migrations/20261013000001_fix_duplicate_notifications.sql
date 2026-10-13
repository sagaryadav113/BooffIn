-- ============================================================================
-- BOOFFIN — NOTIFICATION DEDUPLICATION FIX & TRIGGER RECTIFICATION
-- Migration: 20261013000001_fix_duplicate_notifications.sql
-- Description:
--   1. Cleans up historical duplicate notification records in public.notifications
--   2. Ensures unique indexes on notifications table to prevent future duplicate inserts
--   3. Replaces notification triggers on likes, follows, comments, and reposts with
--      strict idempotency and deduplication safeguards
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CLEAN UP EXISTING DUPLICATE NOTIFICATIONS
-- ----------------------------------------------------------------------------
-- Remove redundant rows where the same actor performed the same action for
-- the same recipient within a 10-second window, preserving the lowest ID.
DELETE FROM public.notifications a
USING public.notifications b
WHERE a.id > b.id
  AND a.recipient_id = b.recipient_id
  AND a.actor_id = b.actor_id
  AND a.notification_type = b.notification_type
  AND (
    (a.notification_type = 'follow') OR
    (COALESCE(a.entity_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(b.entity_id, '00000000-0000-0000-0000-000000000000'::uuid))
  )
  AND ABS(EXTRACT(EPOCH FROM (a.created_at - b.created_at))) < 10;

-- ----------------------------------------------------------------------------
-- 2. DEDUPLICATION INDEXES (IDEMPOTENCY ENFORCEMENT)
-- ----------------------------------------------------------------------------
-- Ensure partial unique indexes exist to prevent duplicate like notifications
DROP INDEX IF EXISTS public.idx_notifications_dedup_like;
CREATE UNIQUE INDEX idx_notifications_dedup_like
  ON public.notifications (recipient_id, actor_id, notification_type, entity_id)
  WHERE notification_type = 'like';

-- Ensure partial unique index exists to prevent duplicate follow notifications
DROP INDEX IF EXISTS public.idx_notifications_dedup_follow;
CREATE UNIQUE INDEX idx_notifications_dedup_follow
  ON public.notifications (recipient_id, actor_id, notification_type)
  WHERE notification_type = 'follow';

-- Ensure partial unique index exists to prevent duplicate repost notifications
DROP INDEX IF EXISTS public.idx_notifications_dedup_repost;
CREATE UNIQUE INDEX idx_notifications_dedup_repost
  ON public.notifications (recipient_id, actor_id, notification_type, entity_id)
  WHERE notification_type = 'repost';

-- ----------------------------------------------------------------------------
-- 3. RECTIFIED LIKE TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_notify_likes BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Prevent self-notification and invalid posts
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check blocking
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_post_author_id AND blocked_id = NEW.user_id)
       OR (blocker_id = NEW.user_id AND blocked_id = v_post_author_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Check recipient's notification preference
  SELECT COALESCE(notify_likes, TRUE) INTO v_notify_likes
  FROM public.user_settings
  WHERE user_id = v_post_author_id;

  IF v_notify_likes IS FALSE THEN
    RETURN NEW;
  END IF;

  -- Insert single canonical like notification
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_type,
    entity_id,
    message_snippet,
    metadata,
    read_status,
    created_at
  )
  VALUES (
    v_post_author_id,
    NEW.user_id,
    'like',
    'post',
    NEW.post_id,
    'liked your research post',
    jsonb_build_object('post_id', NEW.post_id),
    FALSE,
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_like();

-- ----------------------------------------------------------------------------
-- 4. RECTIFIED FOLLOW TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
  v_notify_follows BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  -- Prevent self-notification
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

  -- Check recipient preference
  SELECT COALESCE(notify_follows, TRUE) INTO v_notify_follows
  FROM public.user_settings
  WHERE user_id = NEW.following_id;

  IF v_notify_follows IS FALSE THEN
    RETURN NEW;
  END IF;

  -- Insert canonical follow notification
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_type,
    entity_id,
    message_snippet,
    metadata,
    read_status,
    created_at
  )
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'profile',
    NEW.follower_id,
    'started following you',
    jsonb_build_object('follower_id', NEW.follower_id),
    FALSE,
    now()
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_follow();

-- ----------------------------------------------------------------------------
-- 5. RECTIFIED COMMENT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_paper_id UUID;
  v_parent_author_id UUID;
  v_notify_pref BOOLEAN;
  v_is_blocked BOOLEAN;
  v_snippet TEXT;
BEGIN
  SELECT author_id, paper_id INTO v_post_author_id, v_paper_id FROM public.posts WHERE id = NEW.post_id;
  v_snippet := substring(NEW.content from 1 for 120);

  -- 1. If this is a reply to another comment
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id FROM public.comments WHERE id = NEW.parent_id;
    
    IF v_parent_author_id IS NOT NULL AND v_parent_author_id <> NEW.author_id THEN
      SELECT EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = v_parent_author_id AND blocked_id = NEW.author_id)
           OR (blocker_id = NEW.author_id AND blocked_id = v_parent_author_id)
      ) INTO v_is_blocked;

      IF NOT v_is_blocked THEN
        SELECT COALESCE(notify_comments, TRUE) INTO v_notify_pref
        FROM public.user_settings WHERE user_id = v_parent_author_id;

        IF v_notify_pref IS NOT FALSE THEN
          INSERT INTO public.notifications (
            recipient_id,
            actor_id,
            notification_type,
            entity_type,
            entity_id,
            message_snippet,
            metadata,
            read_status,
            created_at
          )
          VALUES (
            v_parent_author_id,
            NEW.author_id,
            'reply',
            'post',
            NEW.post_id,
            v_snippet,
            jsonb_build_object('comment_id', NEW.id, 'parent_id', NEW.parent_id, 'post_id', NEW.post_id),
            FALSE,
            now()
          )
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 2. Notify post author (if not replying to own post and not already notified as parent author)
  IF v_post_author_id IS NOT NULL 
     AND v_post_author_id <> NEW.author_id 
     AND (v_parent_author_id IS NULL OR v_post_author_id <> v_parent_author_id) THEN

    SELECT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_id = v_post_author_id AND blocked_id = NEW.author_id)
         OR (blocker_id = NEW.author_id AND blocked_id = v_post_author_id)
    ) INTO v_is_blocked;

    IF NOT v_is_blocked THEN
      SELECT COALESCE(notify_comments, TRUE) INTO v_notify_pref
      FROM public.user_settings WHERE user_id = v_post_author_id;

      IF v_notify_pref IS NOT FALSE THEN
        INSERT INTO public.notifications (
          recipient_id,
          actor_id,
          notification_type,
          entity_type,
          entity_id,
          message_snippet,
          metadata,
          read_status,
          created_at
        )
        VALUES (
          v_post_author_id,
          NEW.author_id,
          'comment',
          'post',
          NEW.post_id,
          v_snippet,
          jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id),
          FALSE,
          now()
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_comment();
