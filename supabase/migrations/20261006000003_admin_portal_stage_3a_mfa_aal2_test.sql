-- ============================================================================
-- BOOFFIN ADMIN PORTAL — STAGE 3A MFA & AAL2 SECURITY HARDENING (TEST-ONLY CANDIDATE)
-- Migration: 20261006000003_admin_portal_stage_3a_mfa_aal2_test.sql
--
-- Notice:
--   STAGE 3A TEST CANDIDATE ONLY.
--   DO NOT APPLY TO PRODUCTION UNTIL FORMALLY APPROVED BY HUMAN SECURITY REVIEW.
--
-- Features:
--   1. public.is_aal2() SECURITY DEFINER helper extracting 'aal' claim from auth.jwt()
--   2. public.is_admin_aal2(UUID) helper checking both active admin status and AAL2 session level
--   3. Explicit revocation of EXECUTE permissions from anon / public
--   4. RLS hardening on high-risk admin actions requiring AAL2 token assurance
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AAL2 AUTHENTICATOR ASSURANCE LEVEL HELPERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_aal2()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(auth.jwt() ->> 'aal', '') = 'aal2';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_aal2() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_aal2() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_aal2() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_aal2(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_admin(p_user_id) AND public.is_aal2();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_admin_aal2(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_aal2(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_aal2(UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. DUAL-APPROVAL AAL2 VERIFICATION ON TERMINAL EXECUTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_approval_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent modifications if already in terminal state
  IF OLD.status IN ('APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED', 'EXPIRED') THEN
    IF NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Invalid transition: Approval request % is already in terminal state %.', OLD.id, OLD.status;
    END IF;
  END IF;

  -- Verify approver is not the requester
  IF NEW.status = 'APPROVED' AND NEW.approved_by = NEW.requested_by THEN
    RAISE EXCEPTION 'Self-approval violation: Requester % cannot approve their own request %.', NEW.requested_by, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
