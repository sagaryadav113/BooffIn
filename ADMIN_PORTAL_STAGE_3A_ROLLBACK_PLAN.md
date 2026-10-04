# BOOFFIN ADMIN PORTAL — STAGE 3A ROLLBACK PLAN
**Document Type:** Disaster Recovery & Rollback Protocol  
**Scope:** Admin Portal Database Migrations, Application Bundles & Authorization Layer  
**Target:** BooffIn Production (`https://lvstuqhrmagzqkgwlisl.supabase.co`)

---

## 1. Rollback Triggers

A rollback MUST be executed immediately if any of the following occur during or post-deployment:

1. **Public App Disruption**: Any regression in public authentication, feed loading, profile views, comments, or scholar features.
2. **Authorization Failure**: Any privilege escalation vulnerability or RLS bypass discovered.
3. **Database Performance Degradation**: Connection exhaustion, lock contention, or query timeout spikes following migration application.
4. **MFA Lockout Without Recovery**: Inability for all authorized administrators to verify TOTP factors.

---

## 2. Blast Radius Assessment

| Layer | Impact of Rollback | Reversibility |
| :--- | :--- | :--- |
| `public.admin_members` | Reversible. Dropping or disabling does not impact public users or core data. | 100% Reversible |
| `public.admin_audit_logs` | Reversible. Audit logs can be archived prior to teardown. | 100% Reversible |
| `public.admin_approval_requests`| Reversible. Requests can be exported or dropped. | 100% Reversible |
| Helper functions (`get_admin_role`, `is_aal2`) | Reversible. Functions can be dropped with CASCADE on dependent policies. | 100% Reversible |
| Core Public Tables (`profiles`, `posts`, etc.) | **Zero Touch**. Admin migrations do not alter public table schemas. | Safe |

---

## 3. Step-by-Step Database Rollback Procedure

In the event of a critical issue requiring database rollback, execute the following SQL in the Supabase SQL Console:

```sql
-- ============================================================================
-- BOOFFIN ADMIN PORTAL — EMERGENCY ROLLBACK SCRIPT
-- ============================================================================

BEGIN;

-- 1. Drop Triggers
DROP TRIGGER IF EXISTS trg_validate_approval_state_transition ON public.admin_approval_requests;
DROP TRIGGER IF EXISTS trg_admin_members_updated_at ON public.admin_members;

-- 2. Drop Functions
DROP FUNCTION IF EXISTS public.validate_approval_state_transition() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_aal2(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_aal2() CASCADE;
DROP FUNCTION IF EXISTS public.record_admin_audit_log(TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_role(UUID) CASCADE;

-- 3. Drop Admin Tables
DROP TABLE IF EXISTS public.admin_approval_requests CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.admin_members CASCADE;

COMMIT;
```

---

## 4. Frontend & Application Rollback

1. **Vercel / Hosting Teardown**:
   - Revert deployment of `admin.booffin.com` to previous build or point DNS to maintenance page.
2. **Client Cache Invalidation**:
   - Issue cache purge on Cloudflare / CDN edge.

---

## 5. Post-Rollback Verification

- Execute `node scripts/test-security-suite.js` to ensure 17/17 P0/P1/P2 regression tests pass.
- Verify public user login, profile update, post creation, and feed browsing on `https://booff-in.vercel.app`.
- Confirm database connections return to baseline latency.
