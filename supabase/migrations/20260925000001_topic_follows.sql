-- ============================================================================
-- BooffIn Topic Follows Relationship Migration
-- Version: 20260925000001
-- Description: Establishes explicit relational topic following without data duplication
-- ============================================================================

-- 1. TOPIC_FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.topic_follows (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, topic_id)
);

-- Indices for rapid bidirectional lookups
CREATE INDEX IF NOT EXISTS idx_topic_follows_user_id ON public.topic_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_follows_topic_id ON public.topic_follows(topic_id);

-- Enable Row Level Security
ALTER TABLE public.topic_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read topic follows"
  ON public.topic_follows
  FOR SELECT
  USING (true);

CREATE POLICY "Users can follow topics"
  ON public.topic_follows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow topics"
  ON public.topic_follows
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. COUNTER CACHE TRIGGER FOR TOPIC FOLLOWERS
CREATE OR REPLACE FUNCTION public.fn_handle_topic_follow_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.topics
    SET followers_count = followers_count + 1
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.topics
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_topic_follows_count ON public.topic_follows;
CREATE TRIGGER trg_topic_follows_count
  AFTER INSERT OR DELETE ON public.topic_follows
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_topic_follow_count();
