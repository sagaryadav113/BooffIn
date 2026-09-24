-- ============================================================================
-- BOOFFIN NOTIFICATION SYSTEM MIGRATION
-- Database-driven notifications, deduplication, and RPC functions.
-- ============================================================================

-- 1. Update Notification Type Check Constraints
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'follow',
    'like',
    'comment',
    'reply',
    'repost',
    'paper_discussion',
    'researcher_post',
    'topic_activity',
    'mention',
    'paper_share',
    'topic_update',
    'trending',
    'publisher_update',
    'system'
  ));

-- 2. Ensure entity_type includes topic, paper, profile, comment, post
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_entity_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_entity_type_check
  CHECK (entity_type IN ('post', 'comment', 'paper', 'profile', 'topic'));

-- 3. Add metadata column for enriched contextual payloads if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 4. Deduplication Indexes (Prevents duplicate unread spam notifications)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_like 
  ON public.notifications (recipient_id, actor_id, notification_type, entity_id) 
  WHERE read_status = FALSE AND notification_type = 'like';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_follow 
  ON public.notifications (recipient_id, actor_id, notification_type) 
  WHERE read_status = FALSE AND notification_type = 'follow';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_repost 
  ON public.notifications (recipient_id, actor_id, notification_type, entity_id) 
  WHERE read_status = FALSE AND notification_type = 'repost';

-- ----------------------------------------------------------------------------
-- 5. DATABASE TRIGGERS FOR BACKEND NOTIFICATION CREATION
-- ----------------------------------------------------------------------------

-- A. FOLLOW TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-notification
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      entity_type,
      entity_id,
      message_snippet,
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
      FALSE,
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_follow();


-- B. LIKE TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Prevent self-notification and invalid posts
  IF v_post_author_id IS NOT NULL AND v_post_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      entity_type,
      entity_id,
      message_snippet,
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
      FALSE,
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_like();


-- C. COMMENT & REPLY TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_paper_id UUID;
  v_parent_author_id UUID;
BEGIN
  -- Fetch post information
  SELECT author_id, paper_id INTO v_post_author_id, v_paper_id FROM public.posts WHERE id = NEW.post_id;
  
  -- 1. If this is a reply to another comment
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id FROM public.comments WHERE id = NEW.parent_comment_id;
    
    IF v_parent_author_id IS NOT NULL AND v_parent_author_id <> NEW.author_id THEN
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
        substring(NEW.content from 1 for 120),
        jsonb_build_object('comment_id', NEW.id, 'parent_comment_id', NEW.parent_comment_id),
        FALSE,
        now()
      );
    END IF;
  END IF;

  -- 2. Notify post author (if not replying to own post or already notified as parent comment author)
  IF v_post_author_id IS NOT NULL 
     AND v_post_author_id <> NEW.author_id 
     AND (v_parent_author_id IS NULL OR v_post_author_id <> v_parent_author_id) THEN
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
      substring(NEW.content from 1 for 120),
      jsonb_build_object('comment_id', NEW.id),
      FALSE,
      now()
    );
  END IF;

  -- 3. Paper discussion notification for researchers who interacted with the referenced paper
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
      jsonb_build_object('post_id', NEW.post_id, 'paper_id', v_paper_id),
      FALSE,
      now()
    FROM public.bookmarks b
    WHERE b.paper_id = v_paper_id
      AND b.user_id <> NEW.author_id
      AND (v_post_author_id IS NULL OR b.user_id <> v_post_author_id)
      AND (v_parent_author_id IS NULL OR b.user_id <> v_parent_author_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_comment();


-- D. REPOST TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_repost()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  IF v_post_author_id IS NOT NULL AND v_post_author_id <> NEW.user_id THEN
    INSERT INTO public.notifications (
      recipient_id,
      actor_id,
      notification_type,
      entity_type,
      entity_id,
      message_snippet,
      read_status,
      created_at
    )
    VALUES (
      v_post_author_id,
      NEW.user_id,
      'repost',
      'post',
      NEW.post_id,
      'reposted your research post',
      FALSE,
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_repost ON public.reposts;
CREATE TRIGGER trg_notify_on_repost
  AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_repost();


-- E. ACTIVITY FROM FOLLOWED RESEARCHERS TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_post_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all active followers of the author
  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_type,
    entity_id,
    message_snippet,
    read_status,
    created_at
  )
  SELECT 
    f.follower_id,
    NEW.author_id,
    'researcher_post',
    'post',
    NEW.id,
    substring(NEW.content from 1 for 120),
    FALSE,
    now()
  FROM public.follows f
  WHERE f.following_id = NEW.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_post_created ON public.posts;
CREATE TRIGGER trg_notify_on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_post_created();


-- F. ACTIVITY IN FOLLOWED TOPICS TRIGGER
CREATE OR REPLACE FUNCTION public.fn_notify_on_post_topic()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_topic_name TEXT;
  v_post_content TEXT;
BEGIN
  SELECT author_id, content INTO v_author_id, v_post_content FROM public.posts WHERE id = NEW.post_id;
  SELECT name INTO v_topic_name FROM public.topics WHERE id = NEW.topic_id;

  -- Notify users who follow this topic (excluding the author and followers who already received researcher_post)
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
  SELECT 
    tf.user_id,
    v_author_id,
    'topic_activity',
    'topic',
    NEW.topic_id,
    'New research shared in #' || COALESCE(v_topic_name, 'topic'),
    jsonb_build_object('post_id', NEW.post_id, 'topic_name', v_topic_name),
    FALSE,
    now()
  FROM public.topic_follows tf
  WHERE tf.topic_id = NEW.topic_id
    AND tf.user_id <> v_author_id
    AND tf.user_id NOT IN (
      SELECT follower_id FROM public.follows WHERE following_id = v_author_id
    )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_post_topic ON public.post_topics;
CREATE TRIGGER trg_notify_on_post_topic
  AFTER INSERT ON public.post_topics
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_post_topic();


-- ----------------------------------------------------------------------------
-- 6. RPC STORED PROCEDURES (Status & Counter Management)
-- ----------------------------------------------------------------------------

-- Mark a single notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET read_status = TRUE
  WHERE id = p_notification_id AND recipient_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_status = TRUE
  WHERE recipient_id = p_user_id AND read_status = FALSE;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.notifications
  WHERE recipient_id = p_user_id AND read_status = FALSE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
