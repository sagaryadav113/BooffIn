-- ============================================================================
-- BOOFFIN PLATFORM MIGRATION — E2EE PUBLIC KEY REGISTRY
-- Migration: 20261011000002_user_e2ee_keys_registry.sql
-- Description:
--   1. Adds e2ee_public_key and e2ee_key_fingerprint columns to public.profiles.
--   2. Creates public.user_e2ee_keys registry for secure public identity key exchange.
--   3. Zero-Trust RLS: Users can only publish their own public key; all authenticated
--      researchers can look up public keys for end-to-end encryption.
--   4. Atomic RPC publish_e2ee_public_key for synchronized key registry updates.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD E2EE KEY COLUMNS TO PUBLIC.PROFILES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS e2ee_public_key TEXT,
  ADD COLUMN IF NOT EXISTS e2ee_key_fingerprint TEXT;

-- ----------------------------------------------------------------------------
-- 2. CREATE PUBLIC.USER_E2EE_KEYS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_e2ee_keys (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  key_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_e2ee_keys_fingerprint ON public.user_e2ee_keys(fingerprint);

-- Enable Row Level Security
ALTER TABLE public.user_e2ee_keys ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. RLS POLICIES FOR USER_E2EE_KEYS
-- ----------------------------------------------------------------------------
-- All authenticated researchers can query public keys to encrypt messages
DROP POLICY IF EXISTS "user_e2ee_keys_select_policy" ON public.user_e2ee_keys;
CREATE POLICY "user_e2ee_keys_select_policy"
  ON public.user_e2ee_keys
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only insert or update their own public identity key
DROP POLICY IF EXISTS "user_e2ee_keys_insert_policy" ON public.user_e2ee_keys;
CREATE POLICY "user_e2ee_keys_insert_policy"
  ON public.user_e2ee_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_e2ee_keys_update_policy" ON public.user_e2ee_keys;
CREATE POLICY "user_e2ee_keys_update_policy"
  ON public.user_e2ee_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. ATOMIC RPC: PUBLISH E2EE PUBLIC KEY
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_e2ee_public_key(
  p_public_key TEXT,
  p_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_res JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to publish E2EE public key';
  END IF;

  -- 1. Upsert into public.user_e2ee_keys
  INSERT INTO public.user_e2ee_keys (user_id, public_key, fingerprint, updated_at)
  VALUES (v_uid, p_public_key, p_fingerprint, now())
  ON CONFLICT (user_id) DO UPDATE SET
    public_key = EXCLUDED.public_key,
    fingerprint = EXCLUDED.fingerprint,
    updated_at = now();

  -- 2. Sync to public.profiles
  UPDATE public.profiles
  SET
    e2ee_public_key = p_public_key,
    e2ee_key_fingerprint = p_fingerprint,
    updated_at = now()
  WHERE id = v_uid;

  v_res := jsonb_build_object(
    'success', true,
    'user_id', v_uid,
    'fingerprint', p_fingerprint
  );

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_e2ee_public_key(TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. NOTIFY SCHEMA CACHE RELOAD
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
