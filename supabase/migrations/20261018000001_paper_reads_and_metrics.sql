-- ============================================================================
-- BOOFFIN — YOUTUBE-STYLE GLOBAL PAPER READS & VIEW COUNTS
-- Migration: 20261018000001_paper_reads_and_metrics.sql
-- Description:
--   1. Creates public.paper_reads table to log individual read events
--   2. Creates public.paper_metrics table to store global aggregated counters
--   3. Adds atomic RPC public.record_paper_read() with 15-minute view deduplication
--   4. Adds public.get_batch_paper_metrics() for high-performance batch retrieval
--   5. Configures public read and insert RLS policies for global analytics
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE PAPER_READS TABLE
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

-- Enable RLS
ALTER TABLE public.paper_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Paper Reads" ON public.paper_reads;
CREATE POLICY "Public Read Paper Reads"
  ON public.paper_reads FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow Read Insert" ON public.paper_reads;
CREATE POLICY "Allow Read Insert"
  ON public.paper_reads FOR INSERT
  WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 2. CREATE PAPER_METRICS TABLE
-- ----------------------------------------------------------------------------
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

-- Enable RLS
ALTER TABLE public.paper_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View Paper Metrics" ON public.paper_metrics;
CREATE POLICY "Public View Paper Metrics"
  ON public.paper_metrics FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public Insert Paper Metrics" ON public.paper_metrics;
CREATE POLICY "Public Insert Paper Metrics"
  ON public.paper_metrics FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Paper Metrics" ON public.paper_metrics;
CREATE POLICY "Public Update Paper Metrics"
  ON public.paper_metrics FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ----------------------------------------------------------------------------
-- 3. CREATE SECURE YOUTUBE-STYLE ATOMIC RECORD_PAPER_READ RPC
-- ----------------------------------------------------------------------------
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

  -- 1. Anti-spam / 15-minute YouTube view deduplication for authenticated user or client session
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

  -- 2. Log view event if not recent duplicate
  IF NOT v_is_recent THEN
    INSERT INTO public.paper_reads (paper_id, doi, user_id, client_id)
    VALUES (v_norm_id, NULLIF(v_norm_doi, ''), v_user_id, v_client_id);
  END IF;

  -- 3. Calculate accurate aggregated stats
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

  -- Logarithmic popularity (log10(1 + views) / 5.0 * 100)
  v_popularity := LEAST(100.0, GREATEST(0.0, ROUND((LOG(1.0 + v_total_views) / 5.0 * 100.0)::numeric, 1)));

  -- 4. Upsert into public.paper_metrics
  INSERT INTO public.paper_metrics (
    paper_id,
    doi,
    views,
    unique_readers,
    views_last_hour,
    views_last_24h,
    popularity_score,
    updated_at
  ) VALUES (
    v_norm_id,
    NULLIF(v_norm_doi, ''),
    v_total_views,
    v_unique_readers,
    v_views_1h,
    v_views_24h,
    v_popularity,
    NOW()
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
-- 4. BATCH GET PAPER METRICS RPC (FOR EXPLORE FEED CARDS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_batch_paper_metrics(p_paper_ids TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'paperId', m.paper_id,
      'doi', m.doi,
      'views', m.views,
      'uniqueReaders', m.unique_readers,
      'viewsLastHour', m.views_last_hour,
      'viewsLast24h', m.views_last_24h,
      'communityRating', m.community_rating,
      'ratingScore', m.rating_score,
      'popularityScore', m.popularity_score,
      'hypeScore', m.hype_score
    )
  ) INTO v_result
  FROM public.paper_metrics m
  WHERE m.paper_id = ANY(SELECT LOWER(TRIM(x)) FROM unnest(p_paper_ids) x)
     OR (m.doi IS NOT NULL AND m.doi = ANY(SELECT LOWER(TRIM(x)) FROM unnest(p_paper_ids) x));

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_batch_paper_metrics(TEXT[]) TO anon, authenticated;
