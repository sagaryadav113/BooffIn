# BOOFFIN ADMIN PORTAL — STAGE 1.5 SECURITY FINDINGS

---

## Summary of Findings

| Finding ID | Severity | Category | Affected Object | Status | Remediation Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | **HIGH** | Information Disclosure / Probing | `public.get_admin_role(UUID)`, `public.is_admin(UUID)` | **IDENTIFIED & REMEDIATED IN TEST** | Candidate Test Migration |
| **F-02** | **MEDIUM** | Direct PostgREST Table Insert Spoofing | `public.admin_audit_logs` RLS INSERT Policy | **IDENTIFIED & REMEDIATED IN TEST** | Candidate Test Migration |
| **F-03** | **LOW** | State Machine Transition Replay | `public.admin_approval_requests` Status Transitions | **IDENTIFIED & REMEDIATED IN TEST** | Candidate Test Migration |
| **F-04** | **INFO** | AAL2 / MFA Claims Verification | Database RPC AAL Inspection (`auth.jwt() ->> 'aal'`) | **DOCUMENTED** | Stage 2 / 3 Implementation |

---

## Detailed Finding Descriptions

### Finding F-01: Arbitrary Administrative Identity Enumeration via RPC
- **Finding ID**: `F-01`
- **Severity**: `HIGH`
- **Affected Object**: `public.get_admin_role(UUID)`, `public.is_admin(UUID)`
- **Attack Scenario**: 
  An unauthenticated caller or normal authenticated user sends a direct PostgREST RPC call:
  `POST /rest/v1/rpc/get_admin_role` with body `{"p_user_id": "<target-user-uuid>"}`.
  Because the function was defined as `SECURITY DEFINER` and granted to `anon, authenticated` without verifying caller ownership, it disclosed whether any arbitrary UUID was a `SUPER_ADMIN`, `ADMIN`, or `MODERATOR`.
- **Current Behavior**: Function executes query on `public.admin_members` using owner privileges without asserting `auth.uid() = p_user_id` or caller admin status.
- **Expected Behavior**: Anonymous callers and normal users must only query their own identity (`auth.uid()`). Cross-user administrative lookups must be restricted exclusively to verified administrators.
- **Root Cause**: Missing authorization guard on the `p_user_id` input argument.
- **Recommended Fix**: 
  1. Revoke `EXECUTE` on `get_admin_role(UUID)` and `is_admin(UUID)` from `anon`.
  2. Inside `get_admin_role`: enforce `IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.admin_members WHERE user_id = auth.uid() AND status = 'ACTIVE') THEN RETURN NULL; END IF;`.
- **TEST Migration Required?**: `YES` (`20261006000002_admin_portal_stage_1_5_security_test.sql`)
- **Production Migration Required?**: `NO` (Production remains untouched).

---

### Finding F-02: Direct Table INSERT Actor Spoofing on `admin_audit_logs`
- **Finding ID**: `F-02`
- **Severity**: `MEDIUM`
- **Affected Object**: `public.admin_audit_logs` RLS INSERT Policy
- **Attack Scenario**: 
  While the `record_admin_audit_log()` RPC securely derives `actor_user_id` from `auth.uid()`, an authenticated admin making a raw direct PostgREST table insert `POST /rest/v1/admin_audit_logs` could supply `{ "actor_user_id": "another_admin_uuid", "actor_role": "SUPER_ADMIN" }`.
  The original Stage 1 RLS check `WITH CHECK (public.is_admin(auth.uid()))` only checked that the requester was an admin, but did not assert that the payload's `actor_user_id` matched `auth.uid()`.
- **Current Behavior**: Malicious admin could potentially attribute a fake audit log to a different administrator via direct table POST.
- **Expected Behavior**: Direct table inserts must strictly enforce `actor_user_id = auth.uid()` and `actor_role = public.get_admin_role(auth.uid())`.
- **Recommended Fix**: 
  Update RLS policy on `public.admin_audit_logs`:
  ```sql
  CREATE POLICY "Admins can insert own audit logs"
    ON public.admin_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (
      public.is_admin(auth.uid())
      AND actor_user_id = auth.uid()
      AND actor_role = public.get_admin_role(auth.uid())
    );
  ```
- **TEST Migration Required?**: `YES`
- **Production Migration Required?**: `NO`

---

### Finding F-03: Lack of Terminal State Lock on Dual Approval Requests
- **Finding ID**: `F-03`
- **Severity**: `LOW`
- **Affected Object**: `public.admin_approval_requests`
- **Attack Scenario**: 
  A request in terminal state (`APPROVED`, `REJECTED`, `EXECUTED`, `CANCELLED`) could potentially be updated again via direct PostgREST `PATCH /rest/v1/admin_approval_requests`.
- **Expected Behavior**: Once an approval request is in a terminal state, subsequent updates must be rejected to guarantee state-machine immutability.
- **Recommended Fix**: 
  Add `BEFORE UPDATE` trigger `trg_lock_terminal_approval_state` verifying `OLD.status = 'PENDING'` before permitting any state update.
- **TEST Migration Required?**: `YES`
- **Production Migration Required?**: `NO`

---

### Finding F-04: Database-Level JWT AAL2 Verification
- **Finding ID**: `F-04`
- **Severity**: `INFO`
- **Affected Object**: `admin_members` mutations & high-risk approval execution
- **Analysis**: 
  Supabase provides the JWT claim `auth.jwt() ->> 'aal'`. In Stage 1, MFA is verified at the application session layer. In Stage 3, database policies for critical actions can add `AND (auth.jwt() ->> 'aal') = 'aal2'` for hardened defense-in-depth.
- **Recommended Action**: Architectural design documented for Stage 3 rollout.
