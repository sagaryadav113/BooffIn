-- ============================================================================
-- BOOFFIN WORKSPACE SYSTEM - ADD WORKSPACE MISSING COLUMNS
-- Migration: 20261008000006_add_missing_workspace_columns.sql
-- ============================================================================

-- 1. Ensure all workspace columns exist
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_price_inr INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 2. Sync creator_id and owner_id
UPDATE public.workspaces SET owner_id = creator_id WHERE owner_id IS NULL AND creator_id IS NOT NULL;
UPDATE public.workspaces SET creator_id = owner_id WHERE creator_id IS NULL AND owner_id IS NOT NULL;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
