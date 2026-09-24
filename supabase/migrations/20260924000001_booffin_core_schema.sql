-- ============================================================================
-- BooffIn Core Database Schema Migration
-- Version: 20260924000001
-- Description: Core schema for BooffIn - Research social platform
-- Features:
--   - Full RLS security model with granular policies
--   - Auto-updating timestamps and auth sync triggers
--   - Counter cache management for high-throughput feeds
--   - GIN Trigram search indexing for scientific discovery
--   - Threaded discussion support with ltree hierarchy
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- ----------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Generic updated_at timestamp refresher
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. CORE TABLES
-- ----------------------------------------------------------------------------

-- 2.1 PROFILES TABLE
-- Linked directly to auth.users. Includes public academic identity & metrics.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  academic_title TEXT DEFAULT 'Research Enthusiast',
  institution TEXT DEFAULT 'Independent',
  bio TEXT,
  location TEXT,
  country TEXT,
  orcid_id TEXT UNIQUE,
  orcid_verified BOOLEAN NOT NULL DEFAULT FALSE,
  website_url TEXT,
  research_interests TEXT[] NOT NULL DEFAULT '{}',
  followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
  posts_count INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  saved_count INTEGER NOT NULL DEFAULT 0 CHECK (saved_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2.2 PAPERS TABLE
-- Canonical metadata for peer-reviewed papers, preprints, and publications.
CREATE TABLE IF NOT EXISTS public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doi TEXT,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  journal TEXT NOT NULL,
  publisher TEXT,
  publication_date DATE,
  publication_year INTEGER,
  open_access_status TEXT NOT NULL DEFAULT 'closed' CHECK (
    open_access_status IN ('gold', 'green', 'bronze', 'hybrid', 'closed', 'preprint')
  ),
  open_access_pdf_url TEXT,
  metadata_source TEXT NOT NULL DEFAULT 'crossref',
  citation_count INTEGER NOT NULL DEFAULT 0 CHECK (citation_count >= 0),
  discussion_count INTEGER NOT NULL DEFAULT 0 CHECK (discussion_count >= 0),
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  saves_count INTEGER NOT NULL DEFAULT 0 CHECK (saves_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index on DOI where present
CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_doi_unique ON public.papers(doi) WHERE doi IS NOT NULL;

CREATE TRIGGER trg_papers_updated_at
  BEFORE UPDATE ON public.papers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2.3 PAPER AUTHORS TABLE
-- Normalized author list for papers with order and external IDs (ORCID/Scopus).
CREATE TABLE IF NOT EXISTS public.paper_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_order INTEGER NOT NULL CHECK (author_order >= 1),
  external_author_id TEXT, -- e.g. ORCID '0000-0002-1825-0097'
  affiliation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_paper_author_order UNIQUE (paper_id, author_order)
);

-- 2.4 TOPICS TABLE
-- Research fields, sub-disciplines, and scientific themes.
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Brain',
  category TEXT NOT NULL DEFAULT 'General Science',
  followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  posts_count INTEGER NOT NULL DEFAULT 0 CHECK (posts_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_topic_slug CHECK (slug ~* '^[a-z0-9-]+$')
);

CREATE TRIGGER trg_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2.5 POSTS TABLE
-- User shares, research breakdowns, insights, questions, and discussions.
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (
    post_type IN ('discussion', 'research_share', 'question', 'insight')
  ),
  content TEXT NOT NULL,
  paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (
    visibility IN ('public', 'followers', 'unlisted')
  ),
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER NOT NULL DEFAULT 0 CHECK (comments_count >= 0),
  reposts_count INTEGER NOT NULL DEFAULT 0 CHECK (reposts_count >= 0),
  saves_count INTEGER NOT NULL DEFAULT 0 CHECK (saves_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2.6 COMMENTS TABLE
-- Threaded scientific discussions using materialized path (ltree).
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  path LTREE,
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2.7 LIKES TABLE
-- User likes on research shares and discussion posts.
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- 2.8 REPOSTS TABLE
-- Scientific shares / citations / retweets across user feeds.
CREATE TABLE IF NOT EXISTS public.reposts (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- 2.9 FOLLOWS TABLE
-- Social graph for researchers, postdocs, and enthusiasts.
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT chk_no_self_follow CHECK (follower_id != following_id)
);

-- 2.10 PAPER_TOPICS (Many-to-Many join table)
CREATE TABLE IF NOT EXISTS public.paper_topics (
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (paper_id, topic_id)
);

-- 2.11 POST_TOPICS (Many-to-Many join table)
CREATE TABLE IF NOT EXISTS public.post_topics (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, topic_id)
);

-- 2.12 BOOKMARKS TABLE
-- Saved reading list and reference library for papers or posts.
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_bookmark_target CHECK (
    (post_id IS NOT NULL AND paper_id IS NULL) OR
    (paper_id IS NOT NULL AND post_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_post ON public.bookmarks(user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_paper ON public.bookmarks(user_id, paper_id) WHERE paper_id IS NOT NULL;

-- 2.13 NOTIFICATIONS TABLE
-- Real-time alerts for scientific citations, likes, comments, and follows.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN ('like', 'repost', 'comment', 'follow', 'mention', 'paper_share', 'topic_update', 'system')
  ),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('post', 'comment', 'paper', 'profile', 'topic')
  ),
  entity_id UUID NOT NULL,
  message_snippet TEXT,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. COUNTER CACHE TRIGGERS (Automated Count Maintenance)
-- ----------------------------------------------------------------------------

-- Likes counter trigger
CREATE OR REPLACE FUNCTION public.fn_handle_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_like_count();

-- Reposts counter trigger
CREATE OR REPLACE FUNCTION public.fn_handle_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_repost_count
  AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_repost_count();

-- Comments counter trigger
CREATE OR REPLACE FUNCTION public.fn_handle_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comment_count
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_comment_count();

-- Follows counter trigger
CREATE OR REPLACE FUNCTION public.fn_handle_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_follow_count
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_follow_count();

-- User posts count trigger
CREATE OR REPLACE FUNCTION public.fn_handle_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET posts_count = posts_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.author_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_post_count
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_post_count();

-- Bookmarks counter trigger
CREATE OR REPLACE FUNCTION public.fn_handle_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET saved_count = saved_count + 1 WHERE id = NEW.user_id;
    IF NEW.post_id IS NOT NULL THEN
      UPDATE public.posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
    END IF;
    IF NEW.paper_id IS NOT NULL THEN
      UPDATE public.papers SET saves_count = saves_count + 1 WHERE id = NEW.paper_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET saved_count = GREATEST(0, saved_count - 1) WHERE id = OLD.user_id;
    IF OLD.post_id IS NOT NULL THEN
      UPDATE public.posts SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.post_id;
    END IF;
    IF OLD.paper_id IS NOT NULL THEN
      UPDATE public.papers SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.paper_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_bookmark_count
  AFTER INSERT OR DELETE ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_bookmark_count();

-- Automatic comment path computation for ltree
CREATE OR REPLACE FUNCTION public.fn_set_comment_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path LTREE;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path = text2ltree(replace(NEW.id::text, '-', '_'));
  ELSE
    SELECT path INTO parent_path FROM public.comments WHERE id = NEW.parent_id;
    IF parent_path IS NULL THEN
      NEW.path = text2ltree(replace(NEW.id::text, '-', '_'));
    ELSE
      NEW.path = parent_path || text2ltree(replace(NEW.id::text, '-', '_'));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_comment_path
  BEFORE INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_comment_path();

-- ----------------------------------------------------------------------------
-- 4. AUTH INTEGRATION (Automatic Profile Creation)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_handle TEXT;
  clean_handle TEXT;
  user_full_name TEXT;
  user_avatar TEXT;
  user_academic_title TEXT;
  user_institution TEXT;
BEGIN
  -- Extract metadata or fallback to sensible defaults
  raw_handle := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'handle',
    split_part(NEW.email, '@', 1)
  );
  
  -- Clean handle characters
  clean_handle := regexp_replace(raw_handle, '[^a-zA-Z0-9_]', '', 'g');
  IF length(clean_handle) < 3 THEN
    clean_handle := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'Researcher'
  );

  user_avatar := NEW.raw_user_meta_data->>'avatar_url';
  user_academic_title := COALESCE(NEW.raw_user_meta_data->>'academic_title', 'Research Enthusiast');
  user_institution := COALESCE(NEW.raw_user_meta_data->>'institution', 'Independent');

  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    academic_title,
    institution,
    orcid_id,
    orcid_verified
  )
  VALUES (
    NEW.id,
    clean_handle,
    user_full_name,
    user_avatar,
    user_academic_title,
    user_institution,
    NEW.raw_user_meta_data->>'orcid_id',
    COALESCE((NEW.raw_user_meta_data->>'orcid_verified')::boolean, FALSE)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fired whenever a new user signs up in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. PERFORMANCE & SEARCH INDEXES
-- ----------------------------------------------------------------------------

-- Foreign Key Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_paper_authors_paper_id ON public.paper_authors(paper_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_paper_id ON public.posts(paper_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON public.comments USING gist(path);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_id) WHERE read_status = FALSE;

-- Feed & Sorting Indexes
CREATE INDEX IF NOT EXISTS idx_posts_feed_sorting ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON public.posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_feed_sorting ON public.papers(publication_year DESC NULLS LAST, created_at DESC);

-- Trigram Fuzzy Search Indexes (Discovery Engine)
CREATE INDEX IF NOT EXISTS idx_papers_title_trgm ON public.papers USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_papers_journal_trgm ON public.papers USING gin(journal gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin(username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_topics_name_trgm ON public.topics USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON public.topics(slug);

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- Enable RLS across all 13 core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6.1 PROFILES POLICIES
CREATE POLICY "Public Profiles Read"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users Update Own Profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users Insert Own Profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6.2 PAPERS POLICIES
CREATE POLICY "Public Papers Read"
  ON public.papers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated Users Insert Papers"
  ON public.papers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Update Papers"
  ON public.papers FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 6.3 PAPER AUTHORS POLICIES
CREATE POLICY "Public Paper Authors Read"
  ON public.paper_authors FOR SELECT
  USING (true);

CREATE POLICY "Authenticated Users Manage Authors"
  ON public.paper_authors FOR ALL
  USING (auth.role() = 'authenticated');

-- 6.4 TOPICS POLICIES
CREATE POLICY "Public Topics Read"
  ON public.topics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated Users Create Topics"
  ON public.topics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 6.5 POSTS POLICIES
CREATE POLICY "Public Posts Read"
  ON public.posts FOR SELECT
  USING (
    visibility = 'public' OR
    (visibility = 'followers' AND (
      auth.uid() = author_id OR
      EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = auth.uid() AND following_id = posts.author_id
      )
    )) OR
    auth.uid() = author_id
  );

CREATE POLICY "Users Insert Own Posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users Update Own Posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users Delete Own Posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = author_id);

-- 6.6 COMMENTS POLICIES
CREATE POLICY "Public Comments Read"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Users Insert Own Comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users Update Own Comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users Delete Own Comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id);

-- 6.7 LIKES POLICIES
CREATE POLICY "Public Likes Read"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users Manage Own Likes"
  ON public.likes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.8 REPOSTS POLICIES
CREATE POLICY "Public Reposts Read"
  ON public.reposts FOR SELECT
  USING (true);

CREATE POLICY "Users Manage Own Reposts"
  ON public.reposts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.9 FOLLOWS POLICIES
CREATE POLICY "Public Follows Read"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users Manage Own Follows"
  ON public.follows FOR ALL
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- 6.10 PAPER_TOPICS POLICIES
CREATE POLICY "Public Paper Topics Read"
  ON public.paper_topics FOR SELECT
  USING (true);

CREATE POLICY "Authenticated Users Manage Paper Topics"
  ON public.paper_topics FOR ALL
  USING (auth.role() = 'authenticated');

-- 6.11 POST_TOPICS POLICIES
CREATE POLICY "Public Post Topics Read"
  ON public.post_topics FOR SELECT
  USING (true);

CREATE POLICY "Post Owners Manage Post Topics"
  ON public.post_topics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE id = post_topics.post_id AND author_id = auth.uid()
    )
  );

-- 6.12 BOOKMARKS POLICIES
CREATE POLICY "Users Read Own Bookmarks"
  ON public.bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users Insert Own Bookmarks"
  ON public.bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users Delete Own Bookmarks"
  ON public.bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- 6.13 NOTIFICATIONS POLICIES
CREATE POLICY "Users Read Own Notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users Update Own Notifications Read Status"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users Delete Own Notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = recipient_id);
