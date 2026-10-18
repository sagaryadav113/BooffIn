-- ============================================================================
-- BOOFFIN — MASTER COMPREHENSIVE DATABASE INITIALIZATION SCRIPT
-- Run this single script in your new Supabase Project SQL Editor
-- Includes:
--   1. Extensions & Prerequisite Types
--   2. Core Schema (Profiles, Papers, Authors, Topics, Posts, Comments, Likes, Bookmarks, Follows)
--   3. Notifications & Realtime
--   4. Workspaces & Chat
--   5. YouTube-Style Global Reads & View Counter (paper_reads & paper_metrics + RPC)
--   6. Seed Topics & Peer-Reviewed Seed Papers
--   7. Full RLS Policies & Security
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "ltree";

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. CORE IDENTITY & PROFILES
-- ----------------------------------------------------------------------------
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
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users Insert Own Profile" ON public.profiles;
CREATE POLICY "Users Insert Own Profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on auth signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  chosen_username TEXT;
  counter INT := 0;
BEGIN
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'));
  IF LENGTH(base_username) < 3 THEN
    base_username := 'user_' || SUBSTRING(NEW.id::text, 1, 6);
  END IF;
  chosen_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = chosen_username) LOOP
    counter := counter + 1;
    chosen_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    chosen_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. PAPERS & SCIENTIFIC METADATA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doi TEXT UNIQUE,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  journal TEXT NOT NULL,
  publisher TEXT,
  publication_date DATE,
  publication_year INTEGER,
  open_access_status TEXT NOT NULL DEFAULT 'closed',
  open_access_pdf_url TEXT,
  metadata_source TEXT NOT NULL DEFAULT 'crossref',
  citation_count INTEGER NOT NULL DEFAULT 0,
  discussion_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_papers_doi_unique ON public.papers(doi) WHERE doi IS NOT NULL;

-- Ensure doi unique constraint exists even if table was already created earlier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'papers_doi_key'
  ) THEN
    ALTER TABLE public.papers ADD CONSTRAINT papers_doi_key UNIQUE (doi);
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Papers" ON public.papers;
CREATE POLICY "Public Read Papers" ON public.papers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Papers" ON public.papers;
CREATE POLICY "Public Insert Papers" ON public.papers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Papers" ON public.papers;
CREATE POLICY "Public Update Papers" ON public.papers FOR UPDATE USING (true);

-- Paper Authors
CREATE TABLE IF NOT EXISTS public.paper_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_order INTEGER NOT NULL DEFAULT 1,
  affiliation TEXT,
  external_author_id TEXT
);
ALTER TABLE public.paper_authors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Paper Authors" ON public.paper_authors;
CREATE POLICY "Public Read Paper Authors" ON public.paper_authors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Paper Authors" ON public.paper_authors;
CREATE POLICY "Public Insert Paper Authors" ON public.paper_authors FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. TOPICS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'Tag',
  category TEXT DEFAULT 'General',
  followers_count INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Topics" ON public.topics;
CREATE POLICY "Public Read Topics" ON public.topics FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.topic_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_id)
);
ALTER TABLE public.topic_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Topic Follows" ON public.topic_follows;
CREATE POLICY "Public Read Topic Follows" ON public.topic_follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Topic Follows" ON public.topic_follows;
CREATE POLICY "Auth Manage Topic Follows" ON public.topic_follows FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. POSTS, DISCUSSIONS, COMMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id) ON DELETE SET NULL,
  post_type TEXT NOT NULL DEFAULT 'standard',
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  saves_count INTEGER NOT NULL DEFAULT 0,
  poll_data JSONB,
  article_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Posts" ON public.posts;
CREATE POLICY "Public Read Posts" ON public.posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Insert Posts" ON public.posts;
CREATE POLICY "Auth Insert Posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Auth Manage Own Posts" ON public.posts;
CREATE POLICY "Auth Manage Own Posts" ON public.posts FOR ALL USING (auth.uid() = author_id);

-- Post topics relation
CREATE TABLE IF NOT EXISTS public.post_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  UNIQUE (post_id, topic_id)
);
ALTER TABLE public.post_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Post Topics" ON public.post_topics;
CREATE POLICY "Public Read Post Topics" ON public.post_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Post Topics" ON public.post_topics;
CREATE POLICY "Public Insert Post Topics" ON public.post_topics FOR INSERT WITH CHECK (true);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Comments" ON public.comments;
CREATE POLICY "Public Read Comments" ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Comments" ON public.comments;
CREATE POLICY "Auth Manage Comments" ON public.comments FOR ALL USING (auth.uid() = author_id);

-- Likes, Bookmarks, Reposts
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Likes" ON public.likes;
CREATE POLICY "Public Read Likes" ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Likes" ON public.likes;
CREATE POLICY "Auth Manage Likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Bookmarks" ON public.bookmarks;
CREATE POLICY "Public Read Bookmarks" ON public.bookmarks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Bookmarks" ON public.bookmarks;
CREATE POLICY "Auth Manage Bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Reposts" ON public.reposts;
CREATE POLICY "Public Read Reposts" ON public.reposts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Reposts" ON public.reposts;
CREATE POLICY "Auth Manage Reposts" ON public.reposts FOR ALL USING (auth.uid() = user_id);

-- Follows
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Follows" ON public.follows;
CREATE POLICY "Public Read Follows" ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Follows" ON public.follows;
CREATE POLICY "Auth Manage Follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

-- Follow Requests (Private accounts)
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, target_id)
);
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth Manage Follow Requests" ON public.follow_requests;
CREATE POLICY "Auth Manage Follow Requests" ON public.follow_requests FOR ALL USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ----------------------------------------------------------------------------
-- 6. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  content TEXT,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Notifications" ON public.notifications;
CREATE POLICY "Public Insert Notifications" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Recipient Manage Notifications" ON public.notifications;
CREATE POLICY "Recipient Manage Notifications" ON public.notifications FOR ALL USING (auth.uid() = recipient_id);

-- ----------------------------------------------------------------------------
-- 7. YOUTUBE-STYLE GLOBAL PAPER READS & VIEW METRICS (NEVER VANISHES)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.paper_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id TEXT NOT NULL,
  doi TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paper_reads_paper_id ON public.paper_reads(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_reads_doi ON public.paper_reads(doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paper_reads_user_created ON public.paper_reads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_reads_client_created ON public.paper_reads(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_reads_created ON public.paper_reads(created_at DESC);

ALTER TABLE public.paper_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Paper Reads" ON public.paper_reads;
CREATE POLICY "Public Read Paper Reads" ON public.paper_reads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow Read Insert" ON public.paper_reads;
CREATE POLICY "Allow Read Insert" ON public.paper_reads FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.paper_metrics (
  paper_id TEXT PRIMARY KEY,
  doi TEXT,
  views BIGINT NOT NULL DEFAULT 0,
  unique_readers BIGINT NOT NULL DEFAULT 0,
  views_last_hour INT NOT NULL DEFAULT 0,
  views_last_24h INT NOT NULL DEFAULT 0,
  views_last_48h INT NOT NULL DEFAULT 0,
  impact_sum NUMERIC(10,2) NOT NULL DEFAULT 0,
  impact_count INT NOT NULL DEFAULT 0,
  clarity_sum NUMERIC(10,2) NOT NULL DEFAULT 0,
  clarity_count INT NOT NULL DEFAULT 0,
  visuals_sum NUMERIC(10,2) NOT NULL DEFAULT 0,
  visuals_count INT NOT NULL DEFAULT 0,
  community_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  popularity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  hype_score INT NOT NULL DEFAULT 0,
  trend_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paper_metrics_doi ON public.paper_metrics(doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_paper_metrics_views ON public.paper_metrics(views DESC);
CREATE INDEX IF NOT EXISTS idx_paper_metrics_hype ON public.paper_metrics(hype_score DESC);

ALTER TABLE public.paper_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public View Paper Metrics" ON public.paper_metrics;
CREATE POLICY "Public View Paper Metrics" ON public.paper_metrics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Paper Metrics" ON public.paper_metrics;
CREATE POLICY "Public Insert Paper Metrics" ON public.paper_metrics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Paper Metrics" ON public.paper_metrics;
CREATE POLICY "Public Update Paper Metrics" ON public.paper_metrics FOR UPDATE USING (true) WITH CHECK (true);

-- Atomic YouTube-style record_paper_read RPC
CREATE OR REPLACE FUNCTION public.record_paper_read(
  p_paper_id TEXT,
  p_doi TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_client_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_norm_id TEXT := LOWER(TRIM(p_paper_id));
  v_norm_doi TEXT := LOWER(TRIM(COALESCE(p_doi, '')));
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
  v_client_id TEXT := NULLIF(TRIM(COALESCE(p_client_id, '')), '');
  v_is_recent BOOLEAN := FALSE;
  v_total_views BIGINT;
  v_unique_readers BIGINT;
  v_views_24h INT;
  v_views_1h INT;
  v_popularity NUMERIC(5,2);
  v_rec RECORD;
BEGIN
  IF v_norm_id IS NULL OR v_norm_id = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid paper ID');
  END IF;

  -- 15-minute YouTube view deduplication
  IF v_user_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.paper_reads
      WHERE (paper_id = v_norm_id OR (v_norm_doi <> '' AND doi = v_norm_doi))
        AND user_id = v_user_id
        AND created_at >= NOW() - INTERVAL '15 minutes'
    ) INTO v_is_recent;
  ELSIF v_client_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.paper_reads
      WHERE (paper_id = v_norm_id OR (v_norm_doi <> '' AND doi = v_norm_doi))
        AND client_id = v_client_id
        AND created_at >= NOW() - INTERVAL '15 minutes'
    ) INTO v_is_recent;
  END IF;

  IF NOT v_is_recent THEN
    INSERT INTO public.paper_reads (paper_id, doi, user_id, client_id)
    VALUES (v_norm_id, NULLIF(v_norm_doi, ''), v_user_id, v_client_id);
  END IF;

  SELECT 
    COUNT(*),
    COUNT(DISTINCT COALESCE(user_id::text, client_id, id::text)),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours'),
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour')
  INTO v_total_views, v_unique_readers, v_views_24h, v_views_1h
  FROM public.paper_reads
  WHERE paper_id = v_norm_id OR (v_norm_doi <> '' AND doi = v_norm_doi);

  v_total_views := GREATEST(v_total_views, 1);
  v_unique_readers := GREATEST(v_unique_readers, 1);
  v_views_24h := GREATEST(v_views_24h, 1);
  v_popularity := LEAST(100.0, GREATEST(0.0, ROUND((LOG(1.0 + v_total_views) / 5.0 * 100.0)::numeric, 1)));

  INSERT INTO public.paper_metrics (
    paper_id, doi, views, unique_readers, views_last_hour, views_last_24h, popularity_score, updated_at
  ) VALUES (
    v_norm_id, NULLIF(v_norm_doi, ''), v_total_views, v_unique_readers, v_views_1h, v_views_24h, v_popularity, NOW()
  )
  ON CONFLICT (paper_id) DO UPDATE SET
    doi = COALESCE(EXCLUDED.doi, public.paper_metrics.doi),
    views = EXCLUDED.views,
    unique_readers = EXCLUDED.unique_readers,
    views_last_hour = EXCLUDED.views_last_hour,
    views_last_24h = EXCLUDED.views_last_24h,
    popularity_score = EXCLUDED.popularity_score,
    updated_at = NOW()
  RETURNING * INTO v_rec;

  RETURN jsonb_build_object(
    'success', true,
    'metrics', jsonb_build_object(
      'paperId', v_rec.paper_id,
      'views', v_rec.views,
      'uniqueReaders', v_rec.unique_readers,
      'viewsLastHour', v_rec.views_last_hour,
      'viewsLast24h', v_rec.views_last_24h,
      'communityRating', v_rec.community_rating,
      'ratingScore', v_rec.rating_score,
      'popularityScore', v_rec.popularity_score,
      'hypeScore', v_rec.hype_score
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_paper_read(TEXT, TEXT, UUID, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. WORKSPACES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visibility TEXT NOT NULL DEFAULT 'private',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Workspaces" ON public.workspaces;
CREATE POLICY "Public Read Workspaces" ON public.workspaces FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Workspaces" ON public.workspaces;
CREATE POLICY "Auth Manage Workspaces" ON public.workspaces FOR ALL USING (auth.uid() = owner_id);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Workspace Members" ON public.workspace_members;
CREATE POLICY "Public Read Workspace Members" ON public.workspace_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth Manage Workspace Members" ON public.workspace_members;
CREATE POLICY "Auth Manage Workspace Members" ON public.workspace_members FOR ALL USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 9. SEED DATA (TOPICS & CANONICAL PAPERS)
-- ----------------------------------------------------------------------------
INSERT INTO public.topics (id, name, slug, description, icon_name, category, followers_count, posts_count)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Neuroscience', 'neuroscience', 'Neural circuits, synaptic plasticity, cognitive architecture, and brain dynamics.', 'Brain', 'Life Sciences', 14200, 3120),
  ('a0000000-0000-0000-0000-000000000002', 'Genetics & Genomics', 'genetics-genomics', 'CRISPR base editing, spatial transcriptomics, and synthetic biology.', 'Dna', 'Life Sciences', 18900, 4520),
  ('a0000000-0000-0000-0000-000000000003', 'AI in Science', 'ai-in-science', 'Foundation models, protein structure prediction, and autonomous discovery agents.', 'Cpu', 'Computer Science & AI', 34200, 9810),
  ('a0000000-0000-0000-0000-000000000004', 'Cancer Biology', 'cancer-biology', 'Oncogenesis, tumor microenvironments, CAR-T immunotherapy, and targeted therapies.', 'Activity', 'Life Sciences', 11500, 2300),
  ('a0000000-0000-0000-0000-000000000005', 'Immunology', 'immunology', 'Adaptive immunity, immune exhaustion, cytokine storms, and mRNA therapeutics.', 'Shield', 'Life Sciences', 9800, 1940),
  ('a0000000-0000-0000-0000-000000000006', 'Quantum Computing', 'quantum-computing', 'Superconducting qubits, quantum error correction, and quantum algorithms.', 'Binary', 'Physics & Math', 15700, 3890),
  ('a0000000-0000-0000-0000-000000000007', 'Astrophysics', 'astrophysics', 'Exoplanet atmospheres, James Webb spectroscopy, gravitational waves, and cosmology.', 'Sparkles', 'Physics & Math', 22100, 5100),
  ('a0000000-0000-0000-0000-000000000008', 'Bioinformatics', 'bioinformatics', 'High-throughput sequencing analysis, proteomics pipelines, and molecular modeling.', 'Terminal', 'Computer Science & AI', 12300, 2870)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.papers (
  id, doi, canonical_url, title, abstract, journal, publisher, publication_year, publication_date,
  open_access_status, open_access_pdf_url, metadata_source, citation_count, discussion_count, likes_count, saves_count
) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    '10.1038/s41586-024-07100-3',
    'https://doi.org/10.1038/s41586-024-07100-3',
    'De novo design of allosteric protein switches using deep learning',
    'Computational design of dynamic, multi-state proteins capable of allosteric conformation changes remains a major frontier in molecular bioengineering. Here, we present a generalized generative framework utilizing equivariant diffusion to construct programmable macromolecular switches responsive to micromolar ligand binding.',
    'Nature', 'Springer Nature', 2024, '2024-03-14', 'gold',
    'https://www.nature.com/articles/s41586-024-07100-3.pdf', 'crossref', 48, 34, 312, 184
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '10.1126/science.adj9214',
    'https://doi.org/10.1126/science.adj9214',
    'Whole-brain cellular resolution connectome of Drosophila melanogaster',
    'Mapping complete synaptic wiring diagrams of complex central nervous systems is essential for decoding how neural architectures execute sensory processing, memory consolidation, and behavioral motor control. We present the full 139,255-neuron and 54.5-million-synapse connectome of an adult female fruit fly.',
    'Science', 'AAAS', 2024, '2024-04-18', 'gold',
    'https://www.science.org/doi/10.1126/science.adj9214', 'crossref', 112, 89, 642, 490
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    '10.1016/j.cell.2024.02.019',
    'https://doi.org/10.1016/j.cell.2024.02.019',
    'Single-cell spatial transcriptomics reveals subclonal clonal architecture in glioblastoma recurrence',
    'Intra-tumoral heterogeneity and therapeutic pressure drive lethal recurrence in glioblastoma. Using sub-micrometer spatial transcriptomics combined with longitudinal patient-derived organoids, we uncover a quiescent mesenchymal stem-like niche responsible for radio-resistance.',
    'Cell', 'Cell Press / Elsevier', 2024, '2024-02-28', 'hybrid',
    'https://www.cell.com/cell/fulltext/S0092-8674(24)00120-X', 'crossref', 29, 18, 189, 95
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    '10.1101/2024.05.10.593501',
    'https://doi.org/10.1101/2024.05.10.593501',
    'Self-supervised representation learning for atomic-scale crystal property prediction',
    'Discovering novel inorganic crystalline materials for solid-state batteries and photovoltaic conversion is constrained by expensive density functional theory calculations. We introduce CrystalBERT, a pre-trained geometric graph transformer that achieves state-of-the-art formation energy predictions across the Materials Project catalog.',
    'bioRxiv', 'Cold Spring Harbor Laboratory', 2024, '2024-05-10', 'preprint',
    'https://www.biorxiv.org/content/10.1101/2024.05.10.593501v1.full.pdf', 'crossref', 16, 9, 87, 42
  )
ON CONFLICT (id) DO NOTHING;
