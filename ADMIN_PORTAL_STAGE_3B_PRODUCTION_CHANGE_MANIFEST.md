# BOOFFIN ADMIN PORTAL — STAGE 3B PRODUCTION CHANGE MANIFEST
**Document Type:** Formal Database & Schema Change Manifest  
**Status:** `READY FOR HUMAN REVIEW (NO PRODUCTION MUTATIONS)`  
**Target Backend:** BooffIn Production (`https://lvstuqhrmagzqkgwlisl.supabase.co`)

---

## 1. Candidate Migration Set Summary

The production candidate package consists of 3 ordered, deterministic, and idempotent migrations:

1. [`20261006000001_admin_portal_foundation_test.sql`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/supabase/migrations/20261006000001_admin_portal_foundation_test.sql) — Admin Core Tables, Helper Functions & Initial RLS Policies.
2. [`20261006000002_admin_portal_stage_1_5_security_test.sql`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/supabase/migrations/20261006000002_admin_portal_stage_1_5_security_test.sql) — Stage 1.5 Security Hardening (F-01 UUID Probing Defense, F-02 Actor Spoof Defense, F-03 State Machine Trigger).
3. [`20261006000003_admin_portal_stage_3a_mfa_aal2_test.sql`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/supabase/migrations/20261006000003_admin_portal_stage_3a_mfa_aal2_test.sql) — Stage 3A MFA & AAL2 Token Assurance Helpers (`is_aal2()`, `is_admin_aal2()`).

---

## 2. Granular Database Objects Manifest

| Object Name | Object Type | Action | Candidate Migration | Primary Dependencies | Risk Level | Reversible? | Exists in PROD? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public.admin_members` | Table | `CREATE TABLE IF NOT EXISTS` | `20261006000001` | `auth.users(id)` | LOW | YES | NO |
| `idx_admin_members_user` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_members(user_id)` | LOW | YES | NO |
| `idx_admin_members_role_status` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_members(role, status)` | LOW | YES | NO |
| `trg_admin_members_updated_at` | Trigger | `CREATE TRIGGER` | `20261006000001` | `public.set_updated_at()` | LOW | YES | NO |
| `public.get_admin_role(UUID)` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000002` | `admin_members` | MEDIUM | YES | NO |
| `public.is_admin(UUID)` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000002` | `get_admin_role()` | LOW | YES | NO |
| `public.is_super_admin(UUID)` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000002` | `get_admin_role()` | LOW | YES | NO |
| `public.admin_audit_logs` | Table | `CREATE TABLE IF NOT EXISTS` | `20261006000001` | `auth.users(id)` | LOW | YES | NO |
| `idx_admin_audit_actor` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_audit_logs(actor_user_id)` | LOW | YES | NO |
| `idx_admin_audit_action` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_audit_logs(action)` | LOW | YES | NO |
| `idx_admin_audit_target` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_audit_logs(target_type, target_id)` | LOW | YES | NO |
| `idx_admin_audit_created` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_audit_logs(created_at DESC)` | LOW | YES | NO |
| `public.record_admin_audit_log` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000001` | `admin_audit_logs`, `get_admin_role` | MEDIUM | YES | NO |
| `public.admin_approval_requests`| Table | `CREATE TABLE IF NOT EXISTS` | `20261006000001` | `auth.users(id)` | LOW | YES | NO |
| `chk_no_self_approval` | Constraint | `CHECK CONSTRAINT` | `20261006000001` | `admin_approval_requests` | LOW | YES | NO |
| `idx_approval_requests_status` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_approval_requests(status)` | LOW | YES | NO |
| `idx_approval_requests_target` | Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_approval_requests(target_type, target_id)` | LOW | YES | NO |
| `idx_approval_requests_requester`| Index | `CREATE INDEX IF NOT EXISTS` | `20261006000001` | `admin_approval_requests(requested_by)` | LOW | YES | NO |
| `public.validate_approval_state_transition` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000003` | `admin_approval_requests` | MEDIUM | YES | NO |
| `trg_validate_approval_state_transition` | Trigger | `CREATE TRIGGER` | `20261006000002` | `validate_approval_state_transition` | LOW | YES | NO |
| `public.is_aal2()` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000003` | `auth.jwt()` | LOW | YES | NO |
| `public.is_admin_aal2(UUID)` | Function | `CREATE OR REPLACE FUNCTION` | `20261006000003` | `is_admin()`, `is_aal2()` | LOW | YES | NO |
| `RLS: admin_members` | RLS Policies | `ENABLE RLS` + 4 Policies | `20261006000001` | `admin_members`, `is_admin` | LOW | YES | NO |
| `RLS: admin_audit_logs` | RLS Policies | `ENABLE RLS` + 2 Policies | `20261006000002` | `admin_audit_logs`, `is_admin` | LOW | YES | NO |
| `RLS: admin_approval_requests` | RLS Policies | `ENABLE RLS` + 3 Policies | `20261006000001` | `admin_approval_requests`, `get_admin_role` | LOW | YES | NO |

---

## 3. Existing Production Objects Blast Radius

| Public / Existing Production Domain | Impact Assessment | Security Boundary Verification |
| :--- | :--- | :--- |
| `public.profiles` | **ZERO MUTATIONS** | Read-only admin inspection; existing RLS & private counter masking preserved |
| `public.posts` | **ZERO SCHEMA MUTATIONS** | Moderator deletion passes through existing RLS / owner rules |
| `public.comments` | **ZERO SCHEMA MUTATIONS** | Preserved |
| `public.reports` | **ZERO SCHEMA MUTATIONS** | Existing P2 duplicate report constraint intact |
| `public.follows` / `blocking` | **ZERO SCHEMA MUTATIONS** | P1 bidirectional blocking enforcement intact |
| `public.notifications` | **ZERO SCHEMA MUTATIONS** | P1 notification actor integrity intact |
| `storage.buckets` (`avatars`, `covers`) | **ZERO MUTATIONS** | P0 user folder isolation preserved |
| `auth.users` | **ZERO MUTATIONS** | Referenced strictly via Foreign Keys with `ON DELETE CASCADE / SET NULL` |

---

## 4. Assessment Summary

- **Total Objects to Create in Production:** 25 (3 tables, 8 indexes, 2 triggers, 7 functions, 1 check constraint, 4 table RLS configurations).
- **Existing Production Tables Modified:** **0**.
- **Existing Production Functions Dropped/Replaced:** **0**.
- **Data Loss Risk:** **ZERO**.
