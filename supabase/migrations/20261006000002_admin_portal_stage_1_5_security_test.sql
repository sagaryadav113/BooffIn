-- ============================================================================
-- BOOFFIN ADMIN PORTAL — STAGE 1.5 SECURITY HARDENING (TEST-ONLY CANDIDATE)
-- Migration: 20261006000002_admin_portal_stage_1_5_security_test.sql
--
-- Notice:
--   STAGE 1.5 TEST CANDIDATE ONLY.
--   DO NOT APPLY TO PRODUCTION UNTIL FORMALLY APPROVED FOR STAGE 2.
--
-- Remediations:
--   1. F-01: Harden get_admin_role() against arbitrary UUID enumeration. Revoke anon execute.
--   2. F-02: Harden admin_audit_logs RLS INSERT policy to strictly bind actor_user_id to auth.uid().
--   3. F-03: Add state-machine trigger on admin_approval_requests preventing terminal status mutation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REMEDIATION F-01: HARDEN get_admin_role() & is_admin()
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_role TEXT;
  v_caller_is_admin BOOLEAN := FALSE;
BEGIN
  -- Unauthenticated callers have no identity
  IF v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  -- If querying self, allow lookup
  IF p_user_id IS NULL OR p_user_id = v_caller THEN
    SELECT role INTO v_role
    FROM public.admin_members
    WHERE user_id = v_caller
      AND status = 'ACTIVE';
    RETURN v_role;
  END IF;

  -- If querying another user ID, verify caller is an active administrator first
  SELECT EXISTS (
    SELECT 1 FROM public.admin_members
    WHERE user_id = v_caller
      AND status = 'ACTIVE'
  ) INTO v_caller_is_admin;

  IF NOT v_caller_is_admin THEN
    RETURN NULL; -- Reject cross-user administrative probe by non-admins
  END IF;

  SELECT role INTO v_role
  FROM public.admin_members
  WHERE user_id = p_user_id
    AND status = 'ACTIVE';

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke execute from anon to prevent unauthenticated RPC probing
REVOKE ALL ON FUNCTION public.get_admin_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_role(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;

-- Revoke anon execute on is_admin
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Revoke anon execute on is_super_admin
REVOKE ALL ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. REMEDIATION F-02: HARDEN AUDIT LOG INSERTION AGAINST ACTOR SPOOFING
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert own audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can insert own audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND actor_user_id = auth.uid()
    AND actor_role = public.get_admin_role(auth.uid())
  );


-- ----------------------------------------------------------------------------
-- 3. REMEDIATION F-03: DUAL-APPROVAL TERMINAL STATE PROTECTION TRIGGER
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_validate_approval_state_transition ON public.admin_approval_requests;
CREATE TRIGGER trg_validate_approval_state_transition
  BEFORE UPDATE ON public.admin_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_approval_state_transition();
