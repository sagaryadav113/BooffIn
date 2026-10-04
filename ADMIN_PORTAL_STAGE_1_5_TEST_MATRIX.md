# BOOFFIN ADMIN PORTAL — STAGE 1.5 DIRECT DATABASE AUTHORIZATION & SECURITY TEST MATRIX

---

## 1. Actor vs Direct Database / PostgREST Operation Matrix

This matrix documents the direct database-level authorization enforcement across all actor personas, bypassing all client-side UI code.

| Actor Identity | Direct Operation Target | HTTP / SQL Method | Expected Result | Enforcement Layer | Conformance |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST_UNAUTHENTICATED** | `public.admin_members` | `SELECT` | **DENY (0 rows)** | RLS (`is_admin(NULL) = false`) | **PASS** |
| **TEST_UNAUTHENTICATED** | `public.admin_members` | `INSERT` | **DENY (403/RLS Error)** | RLS (`is_super_admin(NULL) = false`) | **PASS** |
| **TEST_UNAUTHENTICATED** | `public.admin_members` | `UPDATE` | **DENY (0 rows)** | RLS | **PASS** |
| **TEST_UNAUTHENTICATED** | `public.admin_members` | `DELETE` | **DENY (0 rows)** | RLS | **PASS** |
| **TEST_UNAUTHENTICATED** | `public.admin_audit_logs` | `SELECT` | **DENY (0 rows)** | RLS | **PASS** |
| **TEST_UNAUTHENTICATED** | `public.admin_audit_logs` | `INSERT` | **DENY (403/RLS Error)** | RLS | **PASS** |
| **TEST_UNAUTHENTICATED** | `public.admin_approval_requests` | `SELECT` | **DENY (0 rows)** | RLS | **PASS** |
| **TEST_UNAUTHENTICATED** | `rpc/get_admin_role` | `POST` | **DENY (NULL / 403)** | Revoked `anon` execute & auth check | **PASS** |
| **TEST_UNAUTHENTICATED** | `rpc/record_admin_audit_log` | `POST` | **DENY (403 Unauthorized)** | Revoked `anon` execute & `auth.uid() IS NULL` exception | **PASS** |
| **TEST_NORMAL_USER** | `public.admin_members` | `SELECT` | **DENY (0 rows)** | RLS (`is_admin(auth.uid()) = false`) | **PASS** |
| **TEST_NORMAL_USER** | `public.admin_members` | `INSERT (self as SUPER_ADMIN)` | **DENY (403/RLS Error)** | RLS (`is_super_admin(auth.uid()) = false`) | **PASS** |
| **TEST_NORMAL_USER** | `public.admin_members` | `UPDATE (elevate role)` | **DENY (0 rows updated)** | RLS (`is_super_admin(auth.uid()) = false`) | **PASS** |
| **TEST_NORMAL_USER** | `public.admin_audit_logs` | `SELECT` | **DENY (0 rows)** | RLS | **PASS** |
| **TEST_NORMAL_USER** | `public.admin_audit_logs` | `INSERT (spoof audit)` | **DENY (403/RLS Error)** | RLS (`is_admin(auth.uid()) = false`) | **PASS** |
| **TEST_NORMAL_USER** | `public.admin_approval_requests` | `SELECT / INSERT` | **DENY (403/RLS Error)** | RLS (`get_admin_role(auth.uid()) IN (...)`) | **PASS** |
| **TEST_NORMAL_USER** | `rpc/get_admin_role (cross-user)` | `POST` | **DENY (NULL)** | Guard `F-01` blocks non-admin lookup | **PASS** |
| **TEST_NORMAL_USER** | `rpc/record_admin_audit_log` | `POST` | **DENY (Exception: Forbidden)** | Function verifies `get_admin_role() IS NOT NULL` | **PASS** |
| **TEST_MODERATOR** | `public.admin_members` | `SELECT` | **ALLOW (View staff)** | RLS (`is_admin(auth.uid()) = true`) | **PASS** |
| **TEST_MODERATOR** | `public.admin_members` | `INSERT / UPDATE` | **DENY (403/RLS Error)** | RLS (`is_super_admin(auth.uid()) = false`) | **PASS** |
| **TEST_MODERATOR** | `public.admin_audit_logs` | `SELECT` | **DENY (0 rows)** | RLS (`get_admin_role() IN ('SUPER_ADMIN', 'ADMIN')`) | **PASS** |
| **TEST_MODERATOR** | `public.admin_approval_requests` | `SELECT / INSERT` | **DENY (0 rows)** | RLS | **PASS** |
| **TEST_ADMIN** | `public.admin_members` | `UPDATE (self to SUPER_ADMIN)` | **DENY (0 rows updated)** | RLS (`is_super_admin(auth.uid()) = false`) | **PASS** |
| **TEST_ADMIN** | `public.admin_members` | `UPDATE (another admin)` | **DENY (0 rows updated)** | RLS (`is_super_admin(auth.uid()) = false`) | **PASS** |
| **TEST_ADMIN** | `public.admin_audit_logs` | `INSERT (spoofed actor_id)` | **DENY (RLS WITH CHECK fail)** | RLS policy `actor_user_id = auth.uid()` | **PASS** |
| **TEST_ADMIN** | `public.admin_audit_logs` | `UPDATE / DELETE` | **DENY (403/No Policy)** | RLS (Zero UPDATE/DELETE policies) | **PASS** |
| **TEST_ADMIN** | `public.admin_approval_requests` | `INSERT` | **ALLOW (Create request)** | RLS policy | **PASS** |
| **TEST_ADMIN** | `public.admin_approval_requests` | `UPDATE (self-approve)` | **DENY (0 rows updated)** | RLS & `chk_no_self_approval` constraint | **PASS** |
| **TEST_SUPER_ADMIN_A** | `public.admin_approval_requests` | `UPDATE (approve own request)` | **DENY (Constraint violation)** | `chk_no_self_approval` constraint | **PASS** |
| **TEST_SUPER_ADMIN_B** | `public.admin_approval_requests` | `UPDATE (approve A's request)` | **ALLOW (Valid dual-approval)**| RLS & `chk_no_self_approval` passed | **PASS** |
| **ANY_ADMIN** | `public.admin_approval_requests` | `UPDATE (already APPROVED)` | **DENY (Trigger Exception)** | `trg_validate_approval_state_transition` | **PASS** |
| **SUSPENDED_ADMIN** | `public.admin_members` | `SELECT` | **DENY (0 rows)** | `get_admin_role() = NULL` for `status <> 'ACTIVE'` | **PASS** |
| **DEACTIVATED_ADMIN** | `public.admin_members` | `SELECT` | **DENY (0 rows)** | `get_admin_role() = NULL` for `status <> 'ACTIVE'` | **PASS** |

---

## 2. Direct Security Conformance Scenarios Summary

- **Total Direct Database Tests**: 32 Scenarios
- **Total Passing**: 32 / 32
- **Direct RPC Bypass Blocked**: YES
- **Direct PostgREST Bypass Blocked**: YES
- **Audit Immutability Enforced**: YES (No UPDATE/DELETE policies + Spoofing blocked)
- **Two-Person Rule Enforced**: YES (Engine constraint `chk_no_self_approval` + State lock trigger)
