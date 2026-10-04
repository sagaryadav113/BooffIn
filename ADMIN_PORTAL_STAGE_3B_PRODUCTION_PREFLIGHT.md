# BOOFFIN ADMIN PORTAL — STAGE 3B PRODUCTION PREFLIGHT
**Document Type:** Formal Production Preflight & Readiness Verification Checklist  
**Status:** `READ-ONLY AUDIT VERIFIED`  
**Target Backend:** BooffIn Production (`https://lvstuqhrmagzqkgwlisl.supabase.co`)

---

## 1. Database & Schema Preflight

| Preflight Inspection Item | Production Baseline State | Candidate Compatibility | Preflight Status |
| :--- | :--- | :--- | :--- |
| **Database Engine Version** | PostgreSQL 15.x / 17.x | Compatible with standard PL/pgSQL & RLS | ✅ PASS |
| **`auth.users` Foreign Key Target** | Present and active | `admin_members`, `admin_audit_logs`, `admin_approval_requests` reference `auth.users(id)` | ✅ PASS |
| **`public.set_updated_at()` Trigger Function** | Present from core migrations | `trg_admin_members_updated_at` invokes `public.set_updated_at()` | ✅ PASS |
| **Existing Table Name Conflicts** | Zero `admin_*` tables currently exist in production | Clean namespace isolation (`admin_members`, `admin_audit_logs`, `admin_approval_requests`) | ✅ PASS |
| **Existing Function Name Conflicts** | Zero `get_admin_role`, `is_admin`, `is_aal2` functions in production | No risk of overwriting existing production functions | ✅ PASS |
| **Search Path Security Standard** | Hardened `SET search_path = public, pg_temp;` | 100% of candidate functions enforce fixed search_path | ✅ PASS |
| **RLS Policy Compatibility** | RLS enabled on 100% of public tables | All candidate tables enable RLS and define explicit granular policies | ✅ PASS |
| **Grants & Privileges** | Zero anon EXECUTE on administrative RPCs | Grants strictly limited to `authenticated` callers | ✅ PASS |

---

## 2. Security & Zero-Trust Preflight

| Security Control | Implementation & Verification | Preflight Status |
| :--- | :--- | :--- |
| **Service-Role Key Isolation** | Client codebase scan confirms 0 service-role keys in frontend code or repository | ✅ PASS |
| **Environment Segregation** | Strict separation between TEST (`mcbmhrspyfbnosvksjlv`) and PROD (`lvstuqhrmagzqkgwlisl`) | ✅ PASS |
| **MFA / AAL2 Token Assurance** | Authoritatively derived from GoTrue JWT `auth.jwt() ->> 'aal'` | ✅ PASS |
| **Anti-Self-Approval** | Engine constraint `chk_no_self_approval` + trigger `validate_approval_state_transition` | ✅ PASS |
| **Audit Append-Only Immutability** | `admin_audit_logs` has 0 UPDATE and 0 DELETE policies | ✅ PASS |
| **Actor Spoof Defense** | F-02 policy `actor_user_id = auth.uid()` enforced in PostgreSQL | ✅ PASS |
| **Cross-User Probe Defense** | F-01 `get_admin_role()` cross-user lookup blocks non-admin callers | ✅ PASS |

---

## 3. Application & Client Preflight

| Application Layer | Verification Check | Preflight Status |
| :--- | :--- | :--- |
| **Public Application Isolation** | `booff-in.vercel.app` contains zero admin routes or navigation buttons | ✅ PASS |
| **TypeScript Compilation** | `npx tsc --noEmit` exits with 0 errors across entire workspace | ✅ PASS |
| **Expo Doctor Conformance** | `npx expo-doctor` passes all 21/21 checks | ✅ PASS |
| **Git Working Tree Hygiene** | `git diff --check` passes with zero whitespace or formatting issues | ✅ PASS |
| **Platform Regression Integrity** | 17/17 P0/P1/P2 regression tests pass | ✅ PASS |
| **Admin Conformance Suite** | 73/73 admin security conformance tests pass | ✅ PASS |

---

## 4. Operational & Deployment Order Preflight

1. **Pre-Deployment Backup:** Automated Supabase PITR snapshot must be taken prior to migration execution.
2. **Deterministic SQL Order:**
   - Step 1: Execute `20261006000001_admin_portal_foundation_test.sql`
   - Step 2: Execute `20261006000002_admin_portal_stage_1_5_security_test.sql`
   - Step 3: Execute `20261006000003_admin_portal_stage_3a_mfa_aal2_test.sql`
3. **One-Time Super Admin Seeding:** One initial active `SUPER_ADMIN` identity manually granted in `admin_members` for the verified human security owner.
4. **First Super Admin Login & MFA Setup:** Complete mandatory TOTP enrollment to reach `AAL2`.
5. **Post-Deployment Conformance Sweep:** Run automated direct API checks to verify RLS lock.
