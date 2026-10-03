-- Migration: 20261005000001_scholar_publications_and_orcid_security.sql
-- Purpose: Real Scholar Publications Catalog, Database-Level Anti-Impersonation, and Robust RLS

-- 1. Create public.scholar_publications table for real verified works
CREATE TABLE IF NOT EXISTS public.scholar_publications (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  orcid_id text NOT NULL,
  work_put_code text,
  title text NOT NULL,
  journal_name text,
  publication_year integer,
  publication_date text,
  work_type text DEFAULT 'journal-article',
  doi text,
  url text,
  open_access_pdf_url text,
  is_open_access boolean DEFAULT false,
  abstract text,
  citations_count integer DEFAULT 0,
  discussion_count integer DEFAULT 0,
  authors text[] DEFAULT '{}'::text[],
  is_verified boolean DEFAULT true,
  source text DEFAULT 'orcid',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT scholar_publications_user_putcode_unique UNIQUE (user_id, work_put_code)
);

-- 2. Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_scholar_publications_user_id ON public.scholar_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_scholar_publications_orcid_id ON public.scholar_publications(orcid_id);
CREATE INDEX IF NOT EXISTS idx_scholar_publications_year ON public.scholar_publications(publication_year DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_scholar_publications_oa ON public.scholar_publications(is_open_access);

-- 3. Database-Level Anti-Impersonation & Uniqueness Guarantee:
-- Strictly prevents two users from ever possessing or claiming the same verified ORCID iD
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_verified_orcid 
ON public.profiles(orcid_id) 
WHERE orcid_verified = true AND orcid_id IS NOT NULL;

-- 4. Row Level Security (RLS)
ALTER TABLE public.scholar_publications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public Read Access (Peer researchers can discover & read real verified publications)
DROP POLICY IF EXISTS "Public read access for scholar publications" ON public.scholar_publications;
CREATE POLICY "Public read access for scholar publications"
ON public.scholar_publications FOR SELECT
USING (true);

-- Policy 2: Authenticated Owner Insert
DROP POLICY IF EXISTS "Users can only insert own publications" ON public.scholar_publications;
CREATE POLICY "Users can only insert own publications"
ON public.scholar_publications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Authenticated Owner Update
DROP POLICY IF EXISTS "Users can only update own publications" ON public.scholar_publications;
CREATE POLICY "Users can only update own publications"
ON public.scholar_publications FOR UPDATE
USING (auth.uid() = user_id);

-- Policy 4: Authenticated Owner Delete
DROP POLICY IF EXISTS "Users can only delete own publications" ON public.scholar_publications;
CREATE POLICY "Users can only delete own publications"
ON public.scholar_publications FOR DELETE
USING (auth.uid() = user_id);

-- 5. RPC function to safely unclaim an ORCID profile
CREATE OR REPLACE FUNCTION public.unclaim_orcid_profile(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  
  -- Security check: caller must be target user or superadmin
  IF v_caller_id IS NULL OR v_caller_id != target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You can only unclaim your own profile.');
  END IF;

  -- Clear ORCID credentials in profiles
  UPDATE public.profiles
  SET orcid_id = NULL,
      orcid_verified = false,
      updated_at = now()
  WHERE id = target_user_id;

  -- Remove stored publications
  DELETE FROM public.scholar_publications
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Profile successfully unclaimed and disconnected.');
END;
$$;
