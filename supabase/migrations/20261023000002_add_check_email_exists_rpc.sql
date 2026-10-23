-- ==============================================================================
-- Migration: Add check_email_exists RPC function
-- Date: 2026-10-23
-- Description:
--   Allows the client auth flow to pre-flight check if an email already belongs
--   to an existing account in auth.users, cleanly redirecting them to password login.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_email IS NULL OR TRIM(p_email) = '' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE LOWER(email) = LOWER(TRIM(p_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon, authenticated, service_role;
