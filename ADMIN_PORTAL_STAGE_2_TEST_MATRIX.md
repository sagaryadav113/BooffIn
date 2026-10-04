# BOOFFIN ADMIN PORTAL — STAGE 2 TEST MATRIX
**Live Backend Wiring, Multi-Persona RBAC & Direct Database Security**

---

## 1. Multi-Persona Authorization Matrix (UI & Direct API)

| Module / Operation | Anonymous | Normal User | Suspended Admin | Moderator | Admin | Super Admin | Enforcement Layer | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Login** | **ALLOW** | **DENY (403)** | **DENY (403)** | **ALLOW** | **ALLOW** | **ALLOW** | Supabase Auth + `admin_members` check | **PASS** |
| **Dashboard Console** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | `is_admin(auth.uid())` | **PASS** |
| **Users (List/Search)** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | `users.read` permission | **PASS** |
| **Users (Sensitive Edit)** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | `users.view_sensitive` | **PASS** |
| **Reports (View Queue)** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | `reports.read` / RLS | **PASS** |
| **Reports (Resolve/Dismiss)**| **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | `reports.resolve` + Audit log | **PASS** |
| **Moderation (Flagged Posts)**| **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | `posts.read` / RLS | **PASS** |
| **Moderation (Remove Post)** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | `posts.remove` + Audit log | **PASS** |
| **Team (View Staff)** | **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | `admins.read` / RLS | **PASS** |
| **Team (Invite/Elevate)** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | `admins.invite` / `admins.role_change` | **PASS** |
| **Audit Logs (View Trail)** | **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | `audit_logs.read` / RLS | **PASS** |
| **Security (Manage)** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | `security.manage` / Super Admin | **PASS** |
| **Analytics (Live Stats)** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | Aggregate counts | **PASS** |
| **System Health (API Heartbeat)**| **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | `system_health.read` | **PASS** |
| **Settings (View Config)** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | **ALLOW** | Role-aware console config | **PASS** |
| **Approvals (Submit Request)**| **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW** | **ALLOW** | `approvals.create` | **PASS** |
| **Approvals (Self-Approve)** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | `chk_no_self_approval` constraint | **PASS** |
| **Approvals (Authorize Req)** | **DENY** | **DENY** | **DENY** | **DENY** | **DENY** | **ALLOW (Indep.)** | `approvals.approve` + Two-Admin rule | **PASS** |

---

## 2. Direct Database & RLS Invariant Verification

| Invariant ID | Security Scenario | Target Object | Method / Injection | Result | Details |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-DIR-01** | Anonymous PostgREST access | `admin_members` | `GET /rest/v1/admin_members` | **DENIED (0 rows)** | RLS blocks unauthenticated read |
| **SEC-DIR-02** | Normal user self-elevation | `admin_members` | `POST /rest/v1/admin_members` with `SUPER_ADMIN` | **DENIED (RLS Error)** | Only active `SUPER_ADMIN` can insert |
| **SEC-DIR-03** | Suspended admin token reuse | `admin_members` | `GET /rest/v1/admin_members` with suspended JWT | **DENIED (0 rows)** | `get_admin_role()` returns NULL for non-ACTIVE |
| **SEC-DIR-04** | Standard admin role elevation | `admin_members` | `PATCH /rest/v1/admin_members` own role | **DENIED (0 rows)** | RLS UPDATE requires `is_super_admin` |
| **SEC-DIR-05** | Audit actor spoofing attempt | `admin_audit_logs` | `POST` with `actor_user_id = victim` | **DENIED (WITH CHECK Error)** | RLS enforces `actor_user_id = auth.uid()` |
| **SEC-DIR-06** | Audit log modification | `admin_audit_logs` | `PATCH /rest/v1/admin_audit_logs` | **DENIED (No UPDATE policy)** | Table is immutable append-only |
| **SEC-DIR-07** | Audit log deletion | `admin_audit_logs` | `DELETE /rest/v1/admin_audit_logs` | **DENIED (No DELETE policy)** | Zero delete grants/policies |
| **SEC-DIR-08** | Self-approval bypass attempt | `admin_approval_requests` | `PATCH status = APPROVED` as requester | **DENIED (Constraint Error)** | `chk_no_self_approval` constraint blocked |
| **SEC-DIR-09** | Replay terminal approval | `admin_approval_requests` | `PATCH status = PENDING` on approved item | **DENIED (Trigger Error)** | `trg_validate_approval_state_transition` blocked |
| **SEC-DIR-10** | AAL1 high-risk bypass attempt | High-Risk Actions | Invocation with `aal1` token | **DENIED** | AAL2 enforcement gate |

---

## 3. Conformance Summary
- **Total Stage 2 Matrix Scenarios**: 18 Scenarios Evaluated
- **Total Direct Database Invariants**: 10 Invariants Evaluated
- **Total Conformance**: **28 / 28 PASS**
- **Production Status**: `PRODUCTION NOT MODIFIED` (All tests executed against isolated TEST backend `mcbmhrspyfbnosvksjlv.supabase.co`).
