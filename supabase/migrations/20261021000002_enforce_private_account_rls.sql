-- ============================================================================
-- BOOFFIN — ENFORCE PRIVATE ACCOUNT PRIVACY IN RLS (POSTS & FOLLOWS)
-- Migration: 20261021000002_enforce_private_account_rls.sql
-- Description:
--   1. Updates RLS SELECT policy on public.posts to ensure private account posts
--      can ONLY be viewed by the author or approved followers.
--   2. Updates RLS SELECT policy on public.follows to ensure private account
--      followers/following lists can ONLY be viewed by the user or approved followers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN POSTS SELECT POLICY FOR PRIVATE PROFILES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Posts Read" ON public.posts;
CREATE POLICY "Public Posts Read"
  ON public.posts FOR SELECT
  USING (
    (
      -- Author is the viewer
      auth.uid() = author_id
      -- OR Author profile is public (not private)
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = posts.author_id AND is_private = TRUE
      )
      -- OR Viewer is an approved follower of the author
      OR EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid() AND following_id = posts.author_id
      )
    )
    AND (
      visibility = 'public' 
      OR (visibility = 'followers' AND (
        auth.uid() = author_id OR
        EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = auth.uid() AND following_id = posts.author_id
        )
      ))
    )
    AND NOT public.is_blocked_bidirectional(author_id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 2. HARDEN FOLLOWS SELECT POLICY FOR PRIVATE PROFILES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Follows Read" ON public.follows;
CREATE POLICY "Public Follows Read"
  ON public.follows FOR SELECT
  USING (
    -- 1. Viewer is either the follower or the target user
    auth.uid() = follower_id OR auth.uid() = following_id
    -- 2. OR the target profile being followed is public
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = follows.following_id AND is_private = TRUE
    )
    -- 3. OR Viewer is an approved follower of the target private user
    OR EXISTS (
      SELECT 1 FROM public.follows AS viewer_follow
      WHERE viewer_follow.follower_id = auth.uid() AND viewer_follow.following_id = follows.following_id
    )
  );
