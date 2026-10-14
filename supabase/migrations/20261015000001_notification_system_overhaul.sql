-- ============================================================================
-- BOOFFIN — COMPREHENSIVE NOTIFICATION SYSTEM OVERHAUL
-- Migration: 20261015000001_notification_system_overhaul.sql
-- Description:
--   1. Ensures all notification types including 'collaboration_request' are supported
--   2. Fixes comment cleanup trigger so deleted comments purge related notifications
--   3. Adds unlike, unrepost, and unfollow cleanup triggers
--   4. Re-integrates paper discussion notifications for bookmarked researchers
--   5. Implements server-side automated @mention parsing triggers for posts and comments
--   6. Enforces blocking and user preference checks on all paths
--   7. Creates user_push_tokens registry for future device push delivery
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. UPDATE NOTIFICATION TYPE & ENTITY TYPE CONSTRAINTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'follow',
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

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_entity_type_check
  CHECK (entity_type IN ('post', 'comment', 'paper', 'profile', 'topic', 'workspace'));

-- ----------------------------------------------------------------------------
-- 2. DEDUPLICATION INDEXES
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_collab
  ON public.notifications (recipient_id, actor_id, notification_type, entity_id)
  WHERE notification_type = 'collaboration_request';

CREATE INDEX IF NOT EXISTS idx_notifications_metadata_comment_id
  ON public.notifications ((metadata->>'comment_id'))
  WHERE metadata->>'comment_id' IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_metadata_post_id
  ON public.notifications ((metadata->>'post_id'))
  WHERE metadata->>'post_id' IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. RE-INTEGRATED COMMENT & PAPER DISCUSSION TRIGGER
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

  -- 3. Notify researchers who bookmarked the referenced paper
  IF v_paper_id IS NOT NULL THEN
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
    SELECT DISTINCT
      b.user_id,
      NEW.author_id,
      'paper_discussion',
      'paper',
      v_paper_id,
      'New discussion activity on referenced paper',
      jsonb_build_object('post_id', NEW.post_id, 'paper_id', v_paper_id, 'comment_id', NEW.id),
      FALSE,
      now()
    FROM public.bookmarks b
    LEFT JOIN public.user_settings s ON s.user_id = b.user_id
    WHERE b.paper_id = v_paper_id
      AND b.user_id <> NEW.author_id
      AND (v_post_author_id IS NULL OR b.user_id <> v_post_author_id)
      AND (v_parent_author_id IS NULL OR b.user_id <> v_parent_author_id)
      AND COALESCE(s.notify_paper_discussions, TRUE) = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub
        WHERE (ub.blocker_id = b.user_id AND ub.blocked_id = NEW.author_id)
           OR (ub.blocker_id = NEW.author_id AND ub.blocked_id = b.user_id)
      )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_comment();

-- ----------------------------------------------------------------------------
-- 4. SERVER-SIDE AUTOMATED @MENTIONS PARSING TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_on_mentions()
RETURNS TRIGGER AS $$
DECLARE
  v_content TEXT;
  v_post_id UUID;
  v_comment_id UUID;
  v_actor_id UUID;
  v_matches TEXT[];
  v_match TEXT;
  v_clean_handle TEXT;
  v_target_profile RECORD;
  v_notify_pref BOOLEAN;
  v_is_blocked BOOLEAN;
  v_snippet TEXT;
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    v_content := NEW.content;
    v_post_id := NEW.id;
    v_comment_id := NULL;
    v_actor_id := NEW.author_id;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    v_content := NEW.content;
    v_post_id := NEW.post_id;
    v_comment_id := NEW.id;
    v_actor_id := NEW.author_id;
  ELSE
    RETURN NEW;
  END IF;

  IF v_content IS NULL OR length(trim(v_content)) = 0 THEN
    RETURN NEW;
  END IF;

  v_snippet := substring(v_content from 1 for 100);

  -- Extract all @handle patterns using regexp_matches
  FOR v_matches IN 
    SELECT regexp_matches(v_content, '@([a-zA-Z0-9_]{2,30})', 'g')
  LOOP
    v_match := v_matches[1];
    IF v_match IS NOT NULL THEN
      v_clean_handle := lower(v_match);

      -- Find matching profile
      FOR v_target_profile IN
        SELECT id, username FROM public.profiles
        WHERE lower(username) = v_clean_handle AND id <> v_actor_id
      LOOP
        -- Check blocking between actor and mentioned user
        SELECT EXISTS (
          SELECT 1 FROM public.user_blocks
          WHERE (blocker_id = v_target_profile.id AND blocked_id = v_actor_id)
             OR (blocker_id = v_actor_id AND blocked_id = v_target_profile.id)
        ) INTO v_is_blocked;

        IF NOT v_is_blocked THEN
          -- Check mentioned user's preference
          SELECT COALESCE(notify_mentions, TRUE) INTO v_notify_pref
          FROM public.user_settings WHERE user_id = v_target_profile.id;

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
              v_target_profile.id,
              v_actor_id,
              'mention',
              'post',
              v_post_id,
              v_snippet,
              jsonb_build_object(
                'post_id', v_post_id,
                'comment_id', v_comment_id,
                'handle', v_target_profile.username
              ),
              FALSE,
              now()
            )
            ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_post_mentions ON public.posts;
CREATE TRIGGER trg_notify_on_post_mentions
  AFTER INSERT OR UPDATE OF content ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_mentions();

DROP TRIGGER IF EXISTS trg_notify_on_comment_mentions ON public.comments;
CREATE TRIGGER trg_notify_on_comment_mentions
  AFTER INSERT OR UPDATE OF content ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_mentions();

-- ----------------------------------------------------------------------------
-- 5. CONTENT DELETION & ACTION CLEANUP TRIGGERS
-- ----------------------------------------------------------------------------

-- Corrected Comment Cleanup (Checks metadata comment_id)
CREATE OR REPLACE FUNCTION public.fn_cleanup_comment_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE (entity_type = 'comment' AND entity_id = OLD.id)
     OR (metadata->>'comment_id' = OLD.id::text);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_comment_notifications ON public.comments;
CREATE TRIGGER trg_cleanup_comment_notifications
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_comment_notifications();

-- Unlike Cleanup Trigger
CREATE OR REPLACE FUNCTION public.fn_cleanup_like_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE notification_type = 'like'
    AND actor_id = OLD.user_id
    AND entity_id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_like_notifications ON public.likes;
CREATE TRIGGER trg_cleanup_like_notifications
  AFTER DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_like_notifications();

-- Unrepost Cleanup Trigger
CREATE OR REPLACE FUNCTION public.fn_cleanup_repost_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE notification_type = 'repost'
    AND actor_id = OLD.user_id
    AND entity_id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_repost_notifications ON public.reposts;
CREATE TRIGGER trg_cleanup_repost_notifications
  AFTER DELETE ON public.reposts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_repost_notifications();

-- Unfollow Cleanup Trigger
CREATE OR REPLACE FUNCTION public.fn_cleanup_follow_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE notification_type = 'follow'
    AND actor_id = OLD.follower_id
    AND recipient_id = OLD.following_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_follow_notifications ON public.follows;
CREATE TRIGGER trg_cleanup_follow_notifications
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_follow_notifications();

-- ----------------------------------------------------------------------------
-- 6. PUSH TOKEN REGISTRY TABLE (FOR FUTURE & MOBILE DELIVERY)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_push_token UNIQUE (user_id, token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.user_push_tokens;
CREATE POLICY "Users can manage their own push tokens"
  ON public.user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON public.user_push_tokens(user_id);

-- ----------------------------------------------------------------------------
-- 7. WORKSPACE INVITATION NOTIFICATION TRIGGER
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_notify_on_workspace_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_name TEXT;
  v_creator_id UUID;
  v_is_blocked BOOLEAN := false;
BEGIN
  -- Only trigger for invited status
  IF NEW.status <> 'invited' THEN
    RETURN NEW;
  END IF;

  -- Fetch workspace name and creator
  SELECT name, creator_id INTO v_workspace_name, v_creator_id
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  IF v_creator_id IS NULL OR v_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check blocking
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_creator_id AND blocked_id = NEW.user_id)
       OR (blocker_id = NEW.user_id AND blocked_id = v_creator_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Insert notification
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_type,
    entity_id,
    message_snippet,
    metadata
  ) VALUES (
    NEW.user_id,
    v_creator_id,
    'workspace_invitation',
    'workspace',
    NEW.workspace_id,
    COALESCE(v_workspace_name, 'Workspace'),
    jsonb_build_object('workspace_id', NEW.workspace_id, 'workspace_name', v_workspace_name)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_workspace_invitation ON public.workspace_members;
CREATE TRIGGER trg_notify_workspace_invitation
  AFTER INSERT OR UPDATE OF status ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_on_workspace_invitation();

CREATE OR REPLACE FUNCTION public.fn_cleanup_workspace_invitation_notifications()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE notification_type = 'workspace_invitation'
    AND recipient_id = OLD.user_id
    AND entity_id = OLD.workspace_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_cleanup_workspace_invitation_notifications ON public.workspace_members;
CREATE TRIGGER trg_cleanup_workspace_invitation_notifications
  AFTER DELETE ON public.workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_workspace_invitation_notifications();
