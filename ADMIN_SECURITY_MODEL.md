# BOOFFIN ADMIN PORTAL — SECURITY MODEL & THREAT MITIGATION
**Document Version:** 1.0.0 (Stage 1 Architecture)  
**Status:** STAGE 1 ARCHITECTURAL SPECIFICATION

---

## 1. Zero-Trust Administrative Security Foundation

The BooffIn Admin Portal operates on a **Zero-Trust** security architecture. Every administrative action must be authenticated, authorized at the database level, validated for multi-factor authentication (MFA), and recorded to an immutable audit trail.

```
┌────────────────────────────────────────────────────────────┐
│                    ADMIN WEB BROWSER                       │
│    (booffin-admin.vercel.app / admin.booffin.com)          │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              │ 1. HTTPS TLS 1.3
                              │ 2. Supabase Auth Session (JWT)
                              ▼
┌────────────────────────────────────────────────────────────┐
│                  ADMIN ROUTING & AUTH GATE                 │
│  - Blocks unauthenticated callers                          │
│  - Blocks normal platform users (403 Forbidden)            │
│  - Evaluates Authenticator Assurance Level (AAL2)          │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              │ 3. Authenticated RPC / PostgREST
                              ▼
┌────────────────────────────────────────────────────────────┐
│               DATABASE-LEVEL AUTHORIZATION                 │
│  - public.admin_members (Active status + Verified Role)    │
│  - public.is_admin() / public.has_admin_permission()       │
│  - Strict RLS on all tables                                │
│  - Two-Person Approval Engine (admin_approval_requests)   │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              │ 4. Transactional Execution & Audit
                              ▼
┌────────────────────────────────────────────────────────────┐
│              IMMUTABLE AUDIT LOG ENGINE                    │
│  - Appends to public.admin_audit_logs                      │
│  - Actor ID, Role, Action, Target, IP, Reason, Result      │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Modeling & Countermeasures

| Threat Vector | Attack Scenario | Architectural Countermeasure |
| :--- | :--- | :--- |
| **Client-Side Role Tampering** | Attacker modifies React state, `localStorage`, or JWT payload in browser to simulate `SUPER_ADMIN`. | **Database-Enforced Authorization:** Every backend query and RPC checks `public.admin_members` in Postgres. Client-side variables are never trusted for authorization. |
| **Email Domain Exploitation** | Attacker registers an `@booffin.com` email address or spoofs an invite. | **Explicit Whitelist Table:** Access is granted strictly via active records in `public.admin_members`. Email pattern matching (`email.endsWith('@booffin.com')`) is strictly prohibited. |
| **Privilege Self-Escalation** | An `ADMIN` or `MODERATOR` attempts to promote themselves to `SUPER_ADMIN` via direct API mutation. | **RLS & RPC Constraints:** Modifying `admin_members` requires `caller_role = 'SUPER_ADMIN'` and `caller_id <> target_id`. Normal admins and moderators have zero write permissions on `admin_members`. |
| **Single Compromised Admin Credential** | Rogue or compromised admin attempts to delete accounts or purge mass data. | **Two-Person Approval Rule (Dual-Authorization):** Irreversible actions (account deletion, database purge) require an initiation request by Admin A and an independent approval by Admin B. Self-approval is rejected at the database level (`chk_no_self_approval`). |
| **Audit Trail Erasure / Tampering** | Attacker attempts to delete or alter log records to cover tracks. | **Append-Only Audit Logs:** `public.admin_audit_logs` has RLS enabled with `FOR INSERT` only. `UPDATE` and `DELETE` permissions are revoked from all roles (including authenticated admins). |
| **Service Role Leakage** | Exposing `SUPABASE_SERVICE_ROLE_KEY` in frontend bundles. | **Strict Anon-Key Architecture:** The Admin Portal browser client uses the public anonymous key (`SUPABASE_ANON_KEY`) with user sessions. Service-role keys are strictly forbidden in client-side code. |
| **Session Hijacking** | Attacker intercepts session token over insecure network. | **Strict MFA (AAL2) Requirement:** Administrative operations require AAL2 via Supabase TOTP. Normal users logging in without an admin membership record are immediately blocked. |
| **Search Path Poisoning** | Malicious functions overriding standard functions in Postgres. | **Hardened `search_path`:** Every administrative SECURITY DEFINER function declares `SET search_path = public, pg_temp`. |

---

## 3. Multi-Factor Authentication (MFA) Architecture

1. **Assurance Level Standard:**
   - `aal1`: Password or OAuth authentication completed.
   - `aal2`: Authenticated + Time-based One-Time Password (TOTP) verified.
2. **Enforcement Principle:**
   - In Stage 1, the framework and hooks expose `aal` checks from `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
   - In Stage 3, administrative mutations will require active `aal2` sessions before performing sensitive mutations.
3. **MFA Secret Protection:**
   - TOTP secrets and QR enrollment codes are handled directly by Supabase Auth cryptographic services. No custom encryption or raw TOTP secrets are stored in custom tables.

---

## 4. Audit Trail Specification

Every administrative query or mutation must record an entry in `public.admin_audit_logs`:

```json
{
  "actor_user_id": "8f1a234b-c567-4890-a123-456789abcdef",
  "actor_role": "ADMIN",
  "action": "USER_SUSPENDED",
  "target_type": "user",
  "target_id": "3b2c1a0f-1234-5678-9abc-def012345678",
  "reason": "Repeated spam publication violations reported in reports #412, #415",
  "approval_id": null,
  "success": true,
  "metadata": {
    "suspension_duration_days": 7,
    "related_reports": ["412", "415"]
  }
}
```

### Sanitization Rule
Audit logs must **NEVER** capture:
- Passwords or password hashes
- Auth tokens (`access_token`, `refresh_token`, bearer tokens)
- TOTP secrets or verification codes
- Sensitive user payment/billing details
