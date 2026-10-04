# BOOFFIN ADMIN PORTAL — TEST PLAN & VERIFICATION MATRIX (STAGE 1)
**Document Version:** 1.0.0  
**Test Environment:** Isolated Supabase Test Harness & Jest Test Suite  
**Status:** STAGE 1 VERIFICATION

---

## 1. Test Strategy & Objectives

The Stage 1 test suite verifies the **security invariants, role permission boundaries, and regression protections** of the BooffIn Admin Portal before any production deployments occur in Stage 2.

---

## 2. Test Personas

1. **`TEST_UNAUTHENTICATED`**: No active Supabase Auth session.
2. **`TEST_NORMAL_USER`**: Authenticated researcher with standard profile, zero admin membership.
3. **`TEST_MODERATOR`**: Authenticated admin with `role = 'MODERATOR'`.
4. **`TEST_ADMIN`**: Authenticated admin with `role = 'ADMIN'`.
5. **`TEST_SUPER_ADMIN`**: Authenticated admin with `role = 'SUPER_ADMIN'`.

---

## 3. Required Security Test Matrix

| Test ID | Test Scenario | Expected Outcome | Verification Method |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Unauthenticated user attempts to access Admin Portal route. | **BLOCKED (401/Redirect to Admin Login)** | Route Guard & Session check |
| **SEC-02** | Normal authenticated user attempts to access Admin Portal. | **ACCESS DENIED (403 Forbidden)** with access denial UI | `adminAuthorizationService.verifyAdminMembership()` |
| **SEC-03** | Normal user attempts direct SQL/PostgREST insert into `public.admin_members`. | **BLOCKED by RLS (0 rows affected / 42501 permission error)** | PostgreSQL RLS policy test |
| **SEC-04** | Normal user attempts direct SQL/PostgREST read of `public.admin_members`. | **BLOCKED by RLS (Empty array / 42501 error)** | PostgreSQL RLS policy test |
| **SEC-05** | Moderator attempts to view Audit Logs or Admin Team management. | **BLOCKED by Permission Engine (`audit_logs.read` denied)** | `hasPermission('MODERATOR', 'audit_logs.read') === false` |
| **SEC-06** | Admin attempts to change their own role or promote self to Super Admin. | **BLOCKED by Database Constraint & Service Guard** | `admin_change_member_role()` rejects self-mutation |
| **SEC-07** | Admin creates a deletion approval request and attempts to approve it themselves. | **BLOCKED by `chk_no_self_approval` constraint** | PostgreSQL trigger/check constraint verification |
| **SEC-08** | Client modifies React state / localStorage to set `role: "SUPER_ADMIN"`. | **MUTATION BLOCKED by database RLS & backend RPC** | Backend independent query validation |
| **SEC-09** | Direct API mutation to `public.admin_audit_logs` (UPDATE / DELETE). | **BLOCKED (Audit logs are strictly append-only)** | PostgreSQL RLS / GRANT revocation test |
| **SEC-10** | Existing user application flow check (Login, Feed, Profile, Papers). | **PASSED (0 regressions in existing user application)** | TypeScript & User test suite |

---

## 4. Execution Plan & Test Results

The test suite is executable via Node/Jest test scripts (`src/admin/tests/adminSecurity.test.ts` and `scratch/test_admin_security_stage1.js`).
