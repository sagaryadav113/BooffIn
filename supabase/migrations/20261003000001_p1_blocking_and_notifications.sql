-- ============================================================================
-- BOOFFIN — P1 MASTER MIGRATION: BLOCKING & NOTIFICATION ENFORCEMENT
-- Migration: 20261003000001_p1_blocking_and_notifications.sql
-- Description:
--   1. Ensures notifications table constraints support 'collaboration_request'
--   2. Enforces user notification preferences (user_settings) in all notification triggers
--   3. Enforces blocking in all notification triggers (no notifications between blocked pairs)
--   4. Automatically severs follows and terminates active collaboration requests upon block
--   5. Updates toggle_follow() RPC to disallow following blocked users / blockers
--   6. Enforces blocking in RLS policies for posts, comments, likes, reposts, follows, collaborations
--   7. Updates get_user_profile() RPC to enforce blocking with is_blocked flag and masked fields
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NOTIFICATIONS TABLE SCHEMA & CONSTRAINTS ALIGNMENT
-- ----------------------------------------------------------------------------

-- Add 'collaboration_request' to notification_type check constraint
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
    'system',
    'collaboration_request'
  ));

-- Ensure metadata column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 1.1 USER BLOCKS TABLE SETUP & BASE POLICIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can block other users" ON public.user_blocks;
CREATE POLICY "Users can block other users"
  ON public.user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock other users" ON public.user_blocks;
CREATE POLICY "Users can unblock other users"
  ON public.user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);


-- ----------------------------------------------------------------------------
-- 2. BLOCKING RELATIONSHIP CLEANUP TRIGGER
-- ----------------------------------------------------------------------------
-- When User A blocks User B:
--   - Instantly delete mutual follow relationships (triggers handle follow counts)
--   - Terminate active/pending collaboration requests between them
CREATE OR REPLACE FUNCTION public.fn_handle_user_block()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Sever any mutual follows between blocker and blocked
  DELETE FROM public.follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);

  -- 2. Terminate any active or pending collaboration requests
  UPDATE public.collaboration_requests
  SET status = 'withdrawn', updated_at = NOW()
  WHERE ((sender_id = NEW.blocker_id AND recipient_id = NEW.blocked_id)
      OR (sender_id = NEW.blocked_id AND recipient_id = NEW.blocker_id))
    AND status IN ('pending', 'accepted');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_handle_user_block ON public.user_blocks;
CREATE TRIGGER trg_handle_user_block
  AFTER INSERT ON public.user_blocks
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_user_block();


-- ----------------------------------------------------------------------------
-- 3. NOTIFICATION TRIGGERS WITH PREFERENCE & BLOCKING ENFORCEMENT
-- ----------------------------------------------------------------------------

-- A. LIKE TRIGGER: Enforce notify_likes setting + blocking check
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

  -- Check blocking in either direction
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = v_post_author_id AND blocked_id = NEW.user_id)
       OR (blocker_id = NEW.user_id AND blocked_id = v_post_author_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Check recipient's notification preference (default TRUE if row missing or null)
  SELECT COALESCE(notify_likes, TRUE) INTO v_notify_likes
  FROM public.user_settings
  WHERE user_id = v_post_author_id;

  IF v_notify_likes IS FALSE THEN
    RETURN NEW;
  END IF;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_like ON public.likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_like();


-- B. COMMENT TRIGGER: Fix parent_id reference + enforce notify_comments & blocking
CREATE OR REPLACE FUNCTION public.fn_notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_paper_id UUID;
  v_parent_author_id UUID;
  v_notify_pref BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  -- Fetch post information
  SELECT author_id, paper_id INTO v_post_author_id, v_paper_id FROM public.posts WHERE id = NEW.post_id;
  
  -- 1. If this is a reply to another comment (canonical column: parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author_id FROM public.comments WHERE id = NEW.parent_id;
    
    IF v_parent_author_id IS NOT NULL AND v_parent_author_id <> NEW.author_id THEN
      -- Check blocking between reply author and parent comment author
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
            substring(NEW.content from 1 for 120),
            jsonb_build_object('comment_id', NEW.id, 'parent_id', NEW.parent_id),
            FALSE,
            now()
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- 2. Notify post author (if not replying to own post or already notified as parent author)
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
          substring(NEW.content from 1 for 120),
          jsonb_build_object('comment_id', NEW.id),
          FALSE,
          now()
        );
      END IF;
    END IF;
  END IF;

  -- 3. Paper discussion notification for researchers who bookmarked the paper
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
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON public.comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_comment();


-- C. REPOST TRIGGER: Enforce notify_reposts setting + blocking check
CREATE OR REPLACE FUNCTION public.fn_notify_on_repost()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_notify_reposts BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  SELECT author_id INTO v_post_author_id FROM public.posts WHERE id = NEW.post_id;
  
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

  SELECT COALESCE(notify_reposts, TRUE) INTO v_notify_reposts
  FROM public.user_settings
  WHERE user_id = v_post_author_id;

  IF v_notify_reposts IS FALSE THEN
    RETURN NEW;
  END IF;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_repost ON public.reposts;
CREATE TRIGGER trg_notify_on_repost
  AFTER INSERT ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_repost();


-- D. FOLLOW TRIGGER: Enforce blocking check
CREATE OR REPLACE FUNCTION public.fn_notify_on_follow()
RETURNS TRIGGER AS $$
DECLARE
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_follow();


-- E. COLLABORATION REQUEST TRIGGER: Enforce notify_collaboration_requests + blocking
CREATE OR REPLACE FUNCTION public.fn_notify_on_collaboration_request()
RETURNS TRIGGER AS $$
DECLARE
  v_notify_collab BOOLEAN;
  v_is_blocked BOOLEAN;
BEGIN
  -- Prevent self-notification
  IF NEW.sender_id = NEW.recipient_id THEN
    RETURN NEW;
  END IF;

  -- Check blocking
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = NEW.recipient_id AND blocked_id = NEW.sender_id)
       OR (blocker_id = NEW.sender_id AND blocked_id = NEW.recipient_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN NEW;
  END IF;

  -- Check recipient's notification preference (default TRUE if not set)
  SELECT COALESCE(notify_collaboration_requests, TRUE) INTO v_notify_collab
  FROM public.user_settings
  WHERE user_id = NEW.recipient_id;

  IF v_notify_collab IS FALSE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_id,
    entity_type,
    message_snippet,
    metadata,
    read_status,
    created_at
  ) VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'collaboration_request',
    NEW.id,
    'profile',
    'expressed interest in research collaboration regarding ' || NEW.topic,
    jsonb_build_object(
      'topic', NEW.topic,
      'request_id', NEW.id,
      'status', NEW.status,
      'message', NEW.message
    ),
    FALSE,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_notify_collaboration_request ON public.collaboration_requests;
CREATE TRIGGER trg_notify_collaboration_request
  AFTER INSERT ON public.collaboration_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_on_collaboration_request();


-- F. POST CREATION TRIGGER: Enforce notify_researcher_posts + blocking
CREATE OR REPLACE FUNCTION public.fn_notify_on_post_created()
RETURNS TRIGGER AS $$
BEGIN
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
  LEFT JOIN public.user_settings s ON s.user_id = f.follower_id
  WHERE f.following_id = NEW.author_id
    AND COALESCE(s.notify_researcher_posts, TRUE) = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = f.follower_id AND ub.blocked_id = NEW.author_id)
         OR (ub.blocker_id = NEW.author_id AND ub.blocked_id = f.follower_id)
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- G. TOPIC POST TRIGGER: Enforce notify_topic_activity + blocking
CREATE OR REPLACE FUNCTION public.fn_notify_on_post_topic()
RETURNS TRIGGER AS $$
DECLARE
  v_author_id UUID;
  v_topic_name TEXT;
  v_post_content TEXT;
BEGIN
  SELECT author_id, content INTO v_author_id, v_post_content FROM public.posts WHERE id = NEW.post_id;
  SELECT name INTO v_topic_name FROM public.topics WHERE id = NEW.topic_id;

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
  LEFT JOIN public.user_settings s ON s.user_id = tf.user_id
  WHERE tf.topic_id = NEW.topic_id
    AND tf.user_id <> v_author_id
    AND COALESCE(s.notify_topic_activity, TRUE) = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks ub
      WHERE (ub.blocker_id = tf.user_id AND ub.blocked_id = v_author_id)
         OR (ub.blocker_id = v_author_id AND ub.blocked_id = tf.user_id)
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ----------------------------------------------------------------------------
-- 4. ATOMIC TOGGLE FOLLOW RPC HARDENING
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_follow(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_already_following BOOLEAN;
  v_is_following BOOLEAN;
  v_followers_count INT;
  v_following_count INT;
BEGIN
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to follow users.';
  END IF;

  IF v_caller_id = target_user_id THEN
    RAISE EXCEPTION 'Users cannot follow themselves.';
  END IF;

  -- Check if target user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target researcher not found.';
  END IF;

  -- Check if blocking exists in either direction
  IF EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = target_user_id AND blocked_id = v_caller_id)
       OR (blocker_id = v_caller_id AND blocked_id = target_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot follow a blocked researcher.';
  END IF;

  -- Check existing follow status
  SELECT EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = target_user_id
  ) INTO v_already_following;

  IF v_already_following THEN
    -- UNFOLLOW
    DELETE FROM public.follows 
    WHERE follower_id = v_caller_id AND following_id = target_user_id;
    v_is_following := FALSE;
  ELSE
    -- FOLLOW
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_caller_id, target_user_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;
    v_is_following := TRUE;
  END IF;

  -- Retrieve exact current counts
  SELECT count(*) INTO v_followers_count FROM public.follows WHERE following_id = target_user_id;
  SELECT count(*) INTO v_following_count FROM public.follows WHERE follower_id = v_caller_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_following', v_is_following,
    'target_user_id', target_user_id,
    'target_followers_count', v_followers_count,
    'caller_following_count', v_following_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;


-- ----------------------------------------------------------------------------
-- 5. RLS POLICY HARDENING FOR BLOCKING ENFORCEMENT
-- ----------------------------------------------------------------------------

-- 1. Helper function to get post author securely across RLS boundaries
CREATE OR REPLACE FUNCTION public.get_post_author(p_post_id UUID)
RETURNS UUID AS $$
  SELECT author_id FROM public.posts WHERE id = p_post_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Helper function to check bidirectional block status securely across RLS boundaries
CREATE OR REPLACE FUNCTION public.is_blocked_bidirectional(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_a IS NULL OR user_b IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = user_a AND blocked_id = user_b)
       OR (blocker_id = user_b AND blocked_id = user_a)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Update user_blocks SELECT policy
DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can view blocks involving them" ON public.user_blocks;
CREATE POLICY "Users can view blocks involving them"
  ON public.user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- A. POSTS SELECT: Exclude posts if author is blocked by viewer OR viewer blocked author
DROP POLICY IF EXISTS "Public Posts Read" ON public.posts;
CREATE POLICY "Public Posts Read"
  ON public.posts FOR SELECT
  USING (
    (
      visibility = 'public' OR
      (visibility = 'followers' AND (
        auth.uid() = author_id OR
        EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = auth.uid() AND following_id = posts.author_id
        )
      )) OR
      auth.uid() = author_id
    )
    AND NOT public.is_blocked_bidirectional(author_id, auth.uid())
  );

-- B. FOLLOWS INSERT: Deny if blocked in either direction
DROP POLICY IF EXISTS "Users Manage Own Follows" ON public.follows;
DROP POLICY IF EXISTS "Users Insert Own Follows" ON public.follows;
CREATE POLICY "Users Insert Own Follows"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = follower_id AND
    follower_id <> following_id AND
    NOT public.is_blocked_bidirectional(follower_id, following_id)
  );


-- C. COLLABORATION REQUESTS INSERT: Deny if blocked in either direction
DROP POLICY IF EXISTS "Users can send collaboration requests" ON public.collaboration_requests;
CREATE POLICY "Users can send collaboration requests"
  ON public.collaboration_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    sender_id <> recipient_id AND
    NOT public.is_blocked_bidirectional(sender_id, recipient_id)
  );

-- D. COMMENTS INSERT: Deny if commenter and post author have block relationship
DROP POLICY IF EXISTS "Users Insert Own Comments" ON public.comments;
CREATE POLICY "Users Insert Own Comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    NOT public.is_blocked_bidirectional(
      author_id,
      public.get_post_author(post_id)
    )
  );

-- E. LIKES INSERT: Deny if user and post author have block relationship
DROP POLICY IF EXISTS "Users Manage Own Likes" ON public.likes;
CREATE POLICY "Users Manage Own Likes"
  ON public.likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    NOT public.is_blocked_bidirectional(
      user_id,
      public.get_post_author(post_id)
    )
  );

-- F. REPOSTS INSERT: Deny if user and post author have block relationship
DROP POLICY IF EXISTS "Users Manage Own Reposts" ON public.reposts;
CREATE POLICY "Users Manage Own Reposts"
  ON public.reposts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    NOT public.is_blocked_bidirectional(
      user_id,
      public.get_post_author(post_id)
    )
  );


-- ----------------------------------------------------------------------------
-- 6. GET_USER_PROFILE RPC PRIVACY & BLOCKING BOUNDARY
-- ----------------------------------------------------------------------------
-- Updates get_user_profile to detect blocking and return is_blocked: true
-- with all sensitive fields masked if a block relationship exists.
CREATE OR REPLACE FUNCTION public.get_user_profile(
  p_user_id UUID DEFAULT NULL,
  p_username TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_viewer_id UUID := auth.uid();
  v_is_authenticated BOOLEAN := (auth.role() = 'authenticated' AND v_viewer_id IS NOT NULL);
  v_target_profile public.profiles%ROWTYPE;
  v_visibility TEXT := 'private'; -- Fail-closed default
  v_is_owner BOOLEAN := FALSE;
  v_is_connected BOOLEAN := FALSE;
  v_can_access_full BOOLEAN := FALSE;
  v_is_following BOOLEAN := FALSE;
  v_is_blocked BOOLEAN := FALSE;
  v_res jsonb;
BEGIN
  -- A. Resolve target profile by UUID or normalized username
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_user_id;
  ELSIF p_username IS NOT NULL THEN
    SELECT * INTO v_target_profile FROM public.profiles WHERE LOWER(username) = LOWER(TRIM(p_username));
  ELSE
    RETURN NULL;
  END IF;

  IF v_target_profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- B. Determine viewer relationship to target profile
  IF v_viewer_id IS NOT NULL THEN
    v_is_owner := (v_viewer_id = v_target_profile.id);

    IF NOT v_is_owner THEN
      -- Check if blocking exists in either direction
      SELECT EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = v_target_profile.id AND blocked_id = v_viewer_id)
           OR (blocker_id = v_viewer_id AND blocked_id = v_target_profile.id)
      ) INTO v_is_blocked;

      IF NOT v_is_blocked THEN
        -- Check if viewer follows target
        SELECT EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = v_viewer_id AND following_id = v_target_profile.id
        ) INTO v_is_following;

        -- Check if mutual follow or accepted collaboration request exists
        SELECT EXISTS (
          SELECT 1 FROM public.collaboration_requests
          WHERE ((sender_id = v_viewer_id AND recipient_id = v_target_profile.id)
              OR (sender_id = v_target_profile.id AND recipient_id = v_viewer_id))
            AND status = 'accepted'
        ) OR (
          v_is_following AND EXISTS (
            SELECT 1 FROM public.follows
            WHERE follower_id = v_target_profile.id AND following_id = v_viewer_id
          )
        ) INTO v_is_connected;
      END IF;
    END IF;
  END IF;

  -- C. Read target's privacy settings via fail-closed helper
  v_visibility := public.get_user_profile_visibility(v_target_profile.id);

  -- D. Evaluate field access rights
  IF v_is_owner THEN
    v_can_access_full := TRUE;
  ELSIF v_is_blocked THEN
    v_can_access_full := FALSE; -- Blocked users never get full profile
  ELSIF v_visibility = 'public' THEN
    v_can_access_full := TRUE;
  ELSIF v_visibility = 'registered' THEN
    v_can_access_full := v_is_authenticated;
  ELSIF v_visibility = 'private' THEN
    v_can_access_full := v_is_connected;
  ELSE
    v_can_access_full := FALSE; -- Fail closed
  END IF;

  -- E. Construct secure JSON payload
  IF v_can_access_full THEN
    -- Full authorized profile access
    v_res := jsonb_build_object(
      'id', v_target_profile.id,
      'username', v_target_profile.username,
      'full_name', v_target_profile.full_name,
      'avatar_url', v_target_profile.avatar_url,
      'banner_url', v_target_profile.banner_url,
      'has_custom_avatar', v_target_profile.has_custom_avatar,
      'has_custom_banner', v_target_profile.has_custom_banner,
      'academic_title', v_target_profile.academic_title,
      'institution', v_target_profile.institution,
      'bio', v_target_profile.bio,
      'location', v_target_profile.location,
      'country', v_target_profile.country,
      'orcid_id', v_target_profile.orcid_id,
      'orcid_verified', v_target_profile.orcid_verified,
      'website_url', v_target_profile.website_url,
      'department', v_target_profile.department,
      'lab_group', v_target_profile.lab_group,
      'primary_field', v_target_profile.primary_field,
      'secondary_fields', to_jsonb(v_target_profile.secondary_fields),
      'degree_program', v_target_profile.degree_program,
      'graduation_year', v_target_profile.graduation_year,
      'google_scholar_url', v_target_profile.google_scholar_url,
      'researchgate_url', v_target_profile.researchgate_url,
      'linkedin_url', v_target_profile.linkedin_url,
      'scopus_id', v_target_profile.scopus_id,
      'research_interests', to_jsonb(v_target_profile.research_interests),
      'followers_count', v_target_profile.followers_count,
      'following_count', v_target_profile.following_count,
      'posts_count', v_target_profile.posts_count,
      'saved_count', v_target_profile.saved_count,
      'created_at', v_target_profile.created_at,
      'is_following', v_is_following,
      'is_blocked', FALSE,
      'is_private_restricted', FALSE,
      'visibility_level', v_visibility
    );
  ELSE
    -- Restricted access: expose only minimal public discovery identity
    -- All sensitive/extended bio and academic fields are masked as NULL at DB boundary
    v_res := jsonb_build_object(
      'id', v_target_profile.id,
      'username', v_target_profile.username,
      'full_name', v_target_profile.full_name,
      'avatar_url', v_target_profile.avatar_url,
      'banner_url', v_target_profile.banner_url,
      'has_custom_avatar', v_target_profile.has_custom_avatar,
      'has_custom_banner', v_target_profile.has_custom_banner,
      'academic_title', v_target_profile.academic_title,
      'institution', v_target_profile.institution,
      'bio', NULL,
      'location', NULL,
      'country', NULL,
      'orcid_id', v_target_profile.orcid_id,
      'orcid_verified', v_target_profile.orcid_verified,
      'website_url', NULL,
      'department', NULL,
      'lab_group', NULL,
      'primary_field', NULL,
      'secondary_fields', '[]'::jsonb,
      'degree_program', NULL,
      'graduation_year', NULL,
      'google_scholar_url', NULL,
      'researchgate_url', NULL,
      'linkedin_url', NULL,
      'scopus_id', NULL,
      'research_interests', '[]'::jsonb,
      'followers_count', v_target_profile.followers_count,
      'following_count', v_target_profile.following_count,
      'posts_count', v_target_profile.posts_count,
      'saved_count', 0,
      'created_at', v_target_profile.created_at,
      'is_following', v_is_following,
      'is_blocked', v_is_blocked,
      'is_private_restricted', (v_visibility = 'private' OR v_is_blocked),
      'is_registered_restricted', (v_visibility = 'registered' AND NOT v_is_authenticated),
      'visibility_level', v_visibility
    );
  END IF;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_user_profile(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID, TEXT) TO anon, authenticated;
