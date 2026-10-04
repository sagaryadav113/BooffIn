# BOOFFIN ADMIN PORTAL — FUNCTIONAL TEST BASELINE

**Environment:** PRODUCTION
**Supabase URL:** `https://lvstuqhrmagzqkgwlisl.supabase.co`
**Supabase Project Ref:** `lvstuqhrmagzqkgwlisl`
**Recorded At:** `2026-10-04T11:27:34.905Z`
**Authorized Admin Identity:** `sagaryadav1062@gmail.com` (SUPER_ADMIN)

---

## 1. Application Tables (Read-Only Baseline)

| Table | Baseline Record Count | Access State |
| :--- | :--- | :--- |
| `profiles` | 16 | Public / Authenticated read |
| `posts` | 28 | Public read |
| `comments` | 27 | Public read |
| `follows` | 23 | Public read |
| `likes` | 78 | Public read |
| `reposts` | 51 | Public read |
| `bookmarks` | 40 | Public read |
| `notifications` | 145 | Authenticated actor isolated |
| `collaboration_requests` | 0 | Authenticated participant isolated |
| `blocks` | 0 | Authenticated RLS protected |
| `content_reports` | 0 | Admin restricted |

---

## 2. Admin Infrastructure Tables (Read-Only Baseline)

| Table | Baseline Record Count | Access State |
| :--- | :--- | :--- |
| `admin_members` | 0 | Admin RLS / RBAC Protected |
| `admin_audit_logs` | 0 | Append-Only / Immutable |
| `admin_approval_requests` | 0 | Dual-Admin Protocol Enforced |

---

## 3. Initial Active Administrator Summary

* **Target Super Admin Email:** `sagaryadav1062@gmail.com`
* **Role:** `SUPER_ADMIN`
* **Status:** `ACTIVE`
* **MFA Enrollment:** TOTP Authenticator Factor Registered & Verified
* **AAL Requirement:** `AAL2` for high-risk operations

*Baseline recorded successfully before any test mutation.*
