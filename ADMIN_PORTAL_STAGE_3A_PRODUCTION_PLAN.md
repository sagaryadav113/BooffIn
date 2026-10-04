# BOOFFIN ADMIN PORTAL — STAGE 3A PRODUCTION DEPLOYMENT PLAN
**Document Type:** Formal Staging & Production Deployment Specification  
**Status:** `PREPARED (PENDING HUMAN SECURITY REVIEW & SIGN-OFF)`  
**Target Environment:** BooffIn Production (`https://lvstuqhrmagzqkgwlisl.supabase.co`)  
**Safety Invariant:** `DO NOT EXECUTE UNTIL EXPLICIT HUMAN APPROVAL IS GIVEN`

---

## 1. Overview & Objectives

This document establishes the precise, deterministic sequence for deploying the BooffIn Admin Portal and associated database migrations into the Production Supabase backend.

No manual, ad-hoc, or destructive database mutations are permitted. Every migration step is idempotent and verifiable.

---

## 2. Production Deployment Pre-Requisites

Before initiating deployment, the deployment team must verify:

1. **Active Backup Verification**:
   - Supabase Point-in-Time Recovery (PITR) or full snapshot verified within the last 1 hour.
2. **Environment Isolation**:
   - Production service-role keys remain exclusively on secure, developer-controlled deployment pipelines / Supabase Dashboard.
   - Client bundle environment variables (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`) strictly contain publishable/anon credentials.
3. **Public App Regression Suite**:
   - Public user feed, profile, scholar, collaboration, and follow systems verified PASS.

---

## 3. Ordered Production Deployment Sequence

```text
STEP 1: Human Security Approval
        ↓
STEP 2: Automated Pre-Deployment PITR Snapshot
        ↓
STEP 3: Read-Only Schema Preflight Check
        ↓
STEP 4: Apply Candidate Migrations in Strict Order:
        1. 20261006000001_admin_portal_foundation_test.sql
        2. 20261006000002_admin_portal_stage_1_5_security_test.sql
        3. 20261006000003_admin_portal_stage_3a_mfa_aal2_test.sql
        ↓
STEP 5: Database Security & Policy Verification Gate
        ↓
STEP 6: Bootstrap Initial SUPER_ADMIN Identity (One-Time Manual Enrollment)
        ↓
STEP 7: Super Admin Authenticates & Enrolls RFC 6238 TOTP Factor
        ↓
STEP 8: Elevate Session to AAL2 and Verify Audit Log Ingestion
        ↓
STEP 9: Deploy Separate Admin Web Application to admin.booffin.com
        ↓
STEP 10: Run Post-Deployment Live Conformance & Monitoring Sweep
```

---

## 4. Candidate Migration Execution Details

### Migration 1: Foundation (`20261006000001`)
- Creates `public.admin_members` (RLS enabled).
- Creates `public.admin_audit_logs` (Append-only, RLS enabled).
- Creates `public.admin_approval_requests` (Constraint `chk_no_self_approval` enabled).
- Installs `public.get_admin_role()`, `public.is_admin()`, `public.is_super_admin()`, `public.record_admin_audit_log()`.

### Migration 2: Direct API Hardening (`20261006000002`)
- F-01: Hardens `get_admin_role()` against arbitrary UUID probing; revokes anon EXECUTE.
- F-02: Hardens `admin_audit_logs` INSERT policy to bind `actor_user_id = auth.uid()`.
- F-03: Installs state-machine lock trigger `trg_validate_approval_state_transition`.

### Migration 3: TOTP MFA & AAL2 Gate (`20261006000003`)
- Installs `public.is_aal2()` and `public.is_admin_aal2(UUID)`.
- Enforces AAL2 assurance checks for critical actions.
- Hardens `validate_approval_state_transition()` with anti-self-approval enforcement.

---

## 5. Super Admin Bootstrapping Protocol

1. Authorize an existing production user ID as the initial `SUPER_ADMIN` via secure dashboard SQL:
   ```sql
   INSERT INTO public.admin_members (user_id, role, status, invited_by)
   VALUES ('<VERIFIED_PROD_USER_UUID>', 'SUPER_ADMIN', 'ACTIVE', NULL)
   ON CONFLICT (user_id) DO UPDATE SET role = 'SUPER_ADMIN', status = 'ACTIVE';
   ```
2. Super Admin logs into the Admin Portal at `admin.booffin.com`.
3. Super Admin completes mandatory TOTP MFA enrollment on first login.
4. Verify `public.admin_audit_logs` records `MFA_CHALLENGE_VERIFIED` with `actor_role = 'SUPER_ADMIN'`.

---

## 6. Post-Deployment Verification Gate

| Check | Target | Expected Result |
| :--- | :--- | :--- |
| Anon PostgREST access | `admin_members`, `admin_audit_logs` | Blocked (0 rows returned) |
| Normal user access | `admin_members`, `admin_approval_requests` | Blocked (403 Forbidden) |
| AAL1 Super Admin | Critical action (`approvals.approve`) | Blocked (AAL2 Required) |
| AAL2 Super Admin | Critical action (`approvals.approve`) | Permitted |
| Public application | `booff-in.vercel.app` | Zero regression, zero admin buttons |

---

## 7. Operational Monitoring & Alarms

- **Supabase Audit Alerts**: Trigger alert on any failed admin login attempt (`error_code != NULL`).
- **AAL2 Violation Alerts**: Trigger alert on unauthenticated RPC execution attempts.
- **Audit Table Ingestion Health**: Monitor `admin_audit_logs` continuous row count.
