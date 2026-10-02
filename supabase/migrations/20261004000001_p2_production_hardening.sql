-- ==============================================================================
-- BOOFFIN — P2 PRODUCTION HARDENING MIGRATION
-- Migration: 20261004000001_p2_production_hardening.sql
-- 
-- Scope:
-- 1. Server-controlled column protection triggers for profiles, posts, comments
-- 2. Notification cleanup triggers on content deletion
-- 3. Prevent duplicate pending reports via partial unique index (conditional)
-- 4. Foreign key indexes on likes(post_id) and reposts(post_id)
-- 5. SECURITY DEFINER search_path hardening targeting exact canonical PROD functions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Server-Controlled Column Protection Triggers (P2-01 & P2-02)
-- ------------------------------------------------------------------------------

-- Protect profiles server-authoritative and trigger-managed columns
CREATE OR REPLACE FUNCTION public.fn_protect_profile_immutable_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If executing directly from a top-level client update (pg_trigger_depth() = 1),
  -- protect server-authoritative and trigger-managed columns:
  IF pg_trigger_depth() = 1 THEN
    NEW.id := OLD.id;
    NEW.followers_count := OLD.followers_count;
    NEW.following_count := OLD.following_count;
    NEW.posts_count := OLD.posts_count;
    NEW.saved_count := OLD.saved_count;
    NEW.created_at := OLD.created_at;

    -- orcid_verified cannot be set to true without a valid canonical ORCID ID
    IF NEW.orcid_verified = true AND (NEW.orcid_id IS NULL OR NEW.orcid_id !~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$') THEN
      NEW.orcid_verified := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_immutable_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_immutable_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_profile_immutable_columns();


-- Protect posts server-authoritative counters and ownership
CREATE OR REPLACE FUNCTION public.fn_protect_post_counter_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN
    NEW.id := OLD.id;
    NEW.author_id := OLD.author_id;
    NEW.likes_count := OLD.likes_count;
    NEW.comments_count := OLD.comments_count;
    NEW.reposts_count := OLD.reposts_count;
    NEW.saves_count := OLD.saves_count;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_post_counter_columns ON public.posts;
CREATE TRIGGER trg_protect_post_counter_columns
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_post_counter_columns();


-- Protect comments server-authoritative counters, ownership, and hierarchy
CREATE OR REPLACE FUNCTION public.fn_protect_comment_counter_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN
    NEW.id := OLD.id;
    NEW.author_id := OLD.author_id;
    NEW.post_id := OLD.post_id;
    NEW.parent_id := OLD.parent_id;
    NEW.depth := OLD.depth;
    NEW.path := OLD.path;
    NEW.likes_count := OLD.likes_count;
    NEW.replies_count := OLD.replies_count;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_comment_counter_columns ON public.comments;
CREATE TRIGGER trg_protect_comment_counter_columns
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_comment_counter_columns();


-- ------------------------------------------------------------------------------
-- 2. Notification Cleanup Triggers on Content Deletion (P2-06)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_cleanup_post_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE (entity_type = 'post' AND entity_id = OLD.id)
     OR (notification_type IN ('like', 'repost', 'paper_discussion', 'researcher_post') AND entity_id = OLD.id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_post_notifications ON public.posts;
CREATE TRIGGER trg_cleanup_post_notifications
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_post_notifications();


CREATE OR REPLACE FUNCTION public.fn_cleanup_comment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE (entity_type = 'comment' AND entity_id = OLD.id)
     OR (notification_type IN ('comment', 'reply') AND entity_id = OLD.id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_comment_notifications ON public.comments;
CREATE TRIGGER trg_cleanup_comment_notifications
  AFTER DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_cleanup_comment_notifications();


-- ------------------------------------------------------------------------------
-- 3. Prevent Duplicate Pending Reports (P2-05) - Conditional on reports existence
-- ------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS uq_reports_pending ON public.reports (reporter_id, reported_type, reported_id) WHERE status = ''pending''';
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 4. Missing Foreign Key Indexes on Likes and Reposts (P2-07)
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts(post_id);


-- ------------------------------------------------------------------------------
-- 5. Hardening Canonical PRODUCTION SECURITY DEFINER Functions (P2-03)
-- ------------------------------------------------------------------------------

-- Core trigger functions on PROD
ALTER FUNCTION public.handle_post_likes() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_post_comments() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_post_reposts() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_post_bookmarks() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_follow_counts() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_handle_follow_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_settings() SET search_path = public, pg_temp;

-- Notification trigger functions on PROD
ALTER FUNCTION public.handle_new_like_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_follow_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_comment_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_repost_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_remove_like_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_remove_follow_notification() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_remove_repost_notification() SET search_path = public, pg_temp;

-- Follow RPCs on PROD
ALTER FUNCTION public.get_followers(text, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_following(text, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_following_ids(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.toggle_follow(text, text) SET search_path = public, pg_temp;
