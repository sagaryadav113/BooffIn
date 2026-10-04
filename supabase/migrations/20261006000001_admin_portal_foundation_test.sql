-- ============================================================================
-- BOOFFIN — ADMIN PORTAL FOUNDATION (STAGE 1 TEST SPECIFICATION)
-- Migration: 20261006000001_admin_portal_foundation_test.sql
--
-- Notice:
--   STAGE 1 DESIGN & TEST SPECIFICATION ONLY.
--   DO NOT APPLY TO PRODUCTION UNTIL FORMALLY APPROVED FOR STAGE 2.
--
-- Features:
--   1. public.admin_members table with strict role & status constraints
--   2. public.admin_audit_logs table with append-only compliance rules
--   3. public.admin_approval_requests table with two-admin enforcement (chk_no_self_approval)
--   4. SECURITY DEFINER helper functions: is_admin(), get_admin_role(), record_admin_audit_log()
--   5. Granular RLS policies preventing normal users from accessing or modifying admin records
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADMIN MEMBERSHIP TABLE & ROLE SYSTEM
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_members_user ON public.admin_members(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_members_role_status ON public.admin_members(role, status);

CREATE TRIGGER trg_admin_members_updated_at
  BEFORE UPDATE ON public.admin_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. SECURITY DEFINER AUTHORIZATION HELPERS (Hardened search_path)
-- ----------------------------------------------------------------------------

-- Returns active admin role or NULL for normal users / unauthenticated callers
CREATE OR REPLACE FUNCTION public.get_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.admin_members
  WHERE user_id = p_user_id
    AND status = 'ACTIVE';

  RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_admin_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO anon, authenticated;

-- Fast boolean helper for RLS policies
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_admin_role(p_user_id) IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;

-- Fast helper for super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_admin_role(p_user_id) = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 3. IMMUTABLE ADMIN AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  approval_id UUID,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);

-- Helper to record audit log securely
CREATE OR REPLACE FUNCTION public.record_admin_audit_log(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_approval_id UUID DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_code TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_log_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: audit log requires active authentication.';
  END IF;

  v_actor_role := public.get_admin_role(v_actor_id);
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'Forbidden: only verified administrators can record audit logs.';
  END IF;

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    actor_role,
    action,
    target_type,
    target_id,
    reason,
    approval_id,
    success,
    error_code,
    metadata
  ) VALUES (
    v_actor_id,
    v_actor_role,
    p_action,
    p_target_type,
    p_target_id,
    p_reason,
    p_approval_id,
    p_success,
    p_error_code,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.record_admin_audit_log(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_admin_audit_log(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB) TO authenticated;


-- ----------------------------------------------------------------------------
-- 4. TWO-PERSON DUAL APPROVAL REQUESTS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'EXPIRED', 'CANCELLED')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  -- TWO-ADMIN RULE: Requester CANNOT approve their own action
  CONSTRAINT chk_no_self_approval CHECK (approved_by IS NULL OR requested_by <> approved_by)
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.admin_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_target ON public.admin_approval_requests(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON public.admin_approval_requests(requested_by);


-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- A. ADMIN MEMBERS RLS
ALTER TABLE public.admin_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin members" ON public.admin_members;
CREATE POLICY "Admins can view admin members"
  ON public.admin_members FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can insert admin members" ON public.admin_members;
CREATE POLICY "Super Admins can insert admin members"
  ON public.admin_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can update admin members" ON public.admin_members;
CREATE POLICY "Super Admins can update admin members"
  ON public.admin_members FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can delete admin members" ON public.admin_members;
CREATE POLICY "Super Admins can delete admin members"
  ON public.admin_members FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- B. AUDIT LOGS RLS (Append-Only)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Notice: NO UPDATE OR DELETE policies are created on public.admin_audit_logs,
-- guaranteeing immutable append-only compliance behavior.

-- C. APPROVAL REQUESTS RLS
ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view approval requests" ON public.admin_approval_requests;
CREATE POLICY "Admins can view approval requests"
  ON public.admin_approval_requests FOR SELECT
  TO authenticated
  USING (public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN'));

DROP POLICY IF EXISTS "Admins can create approval requests" ON public.admin_approval_requests;
CREATE POLICY "Admins can create approval requests"
  ON public.admin_approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_admin_role(auth.uid()) IN ('SUPER_ADMIN', 'ADMIN')
    AND auth.uid() = requested_by
  );

DROP POLICY IF EXISTS "Super Admins can update approval requests" ON public.admin_approval_requests;
CREATE POLICY "Super Admins can update approval requests"
  ON public.admin_approval_requests FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    -- Requester cannot update status to approved
    AND (status <> 'APPROVED' OR auth.uid() <> requested_by)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    AND (status <> 'APPROVED' OR auth.uid() <> requested_by)
  );
