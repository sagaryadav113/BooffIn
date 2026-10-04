# BOOFFIN ADMIN PORTAL — VERCEL PRE-DEPLOYMENT READINESS REPORT

**Date:** 2026-10-04  
**Target Deployment:** Separate Vercel Project (`booffin-admin` / `admin.booffin.com`)  
**Existing Production Project:** `booff-in.vercel.app` (Isolated)  
**Backend:** Supabase Production Database (`lvstuqhrmagzqkgwlisl`)  
**Super Admin Account:** `sagaryadav1062@gmail.com`  
**Deployment Preparation Mode:** Read-Only Verification & Security Audit

---

## 1. Readiness Checklist Matrix

| Evaluation Area | Status | Verification Summary |
| :--- | :---: | :--- |
| **Architecture** | **PASS** | Monorepo structure supports dual Vercel projects sharing core code with isolated entry points and independent environment boundary configurations. |
| **Build** | **PASS** | TypeScript (`npx tsc --noEmit`) passes with 0 errors. Static export (`npx expo export --platform web`) bundles 3,438 modules and 47 routes successfully. |
| **Expo Doctor** | **NON-BLOCKING WARNING / NETWORK TIMEOUT** | 19/21 checks passed. 1 warning (`react-native-worklets@0.10.1` vs expected `0.5.1`). 1 check failed due to remote npm package metadata network fetch timeout (not a project config or code error). |
| **Environment Variables** | **ATTENTION REQUIRED (PUBLIC ORCID)** | Admin Portal requires only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_APP_ENV`. However, public app code contains `EXPO_PUBLIC_ORCID_CLIENT_SECRET`. |
| **Authentication** | **PASS** | GoTrue email/password authentication gate active; unauthenticated requests to `/admin` are halted at the login view without exposing dashboard data. |
| **MFA / AAL2** | **PASS** | TOTP RFC 6238 challenge strictly enforced (`AdminMfaView`); elevated privileges blocked until AAL2 is reached; ephemeral enrollment secrets kept in-memory and wiped on unmount. |
| **RBAC** | **PASS** | Backend PostgreSQL Row Level Security (RLS) and stored procedures remain the authoritative security mechanism across `MODERATOR`, `ADMIN`, and `SUPER_ADMIN` tiers. |
| **Secret Exposure** | **BLOCKED (ORCID SECRET IN PUBLIC BUNDLE)** | `EXPO_PUBLIC_ORCID_CLIENT_SECRET` in `.env` is inlined into compiled JS bundle due to `EXPO_PUBLIC_` prefix in public app OAuth code. Zero Supabase service-role keys or database passwords found. |
| **Production Database Safety** | **PASS** | Zero migrations, schema modifications, database pushes, or record mutations were executed. Supabase production remains completely untouched. |
| **Public App Isolation** | **PASS** | Public app routes (`/`, `/feed`, `/profile`, `/papers`) load without admin leakage. |
| **UI Integrity** | **PASS** | Current manually modified Admin Portal UI in `src/admin` is 100% preserved and treated as authoritative. Zero UI restyling, redesign, or restructuring was made. |
| **Vercel Configuration** | **PASS** | Deployment configuration and Vercel project settings fully documented without altering public project's `vercel.json`. |
| **Browser Smoke Test** | **PASS** | Automated headless test verified unauthenticated `/admin` route presents login shell and public root loads without errors. |
| **Git State** | **PASS** | Working tree clean on branch `main`; `git diff --check` passed with 0 issues; `.env` is strictly ignored by `.gitignore`. |

---

## 2. Security & Environment Exposure Analysis

### A. EXPO_PUBLIC_ORCID_CLIENT_SECRET
* **Configured Locally:** YES (present in `.env`)
* **Referenced in Code:** YES (`src/app/orcid-callback.tsx` line 68, `src/api/orcidService.ts` line 372)
* **Present in Web Bundle:** YES (Inlined into `_expo/static/js/web/entry-*.js` because of `EXPO_PUBLIC_` prefix)
* **Classification:** Genuine OAuth 2.0 Client Secret (confidential credential for ORCID token exchange).
* **Impact on Admin Portal:** The Admin Portal does NOT use or require this variable. If omitted from the Admin Vercel Project environment variables, the value will not be bundled on Vercel. However, because the public app route (`/orcid-callback`) references it via `EXPO_PUBLIC_`, any build with this variable set in the environment will bake the secret into the bundle.

### B. Supabase & Database Secrets
* **Supabase Service-Role Keys:** NO (0 instances in source code or build bundle)
* **Supabase Management / Access Tokens:** NO
* **Database Master Passwords:** NO
* **JWT Signing Secrets:** NO

---

## 3. Issues Breakdown

### 1. Security Blockers
* **`EXPO_PUBLIC_ORCID_CLIENT_SECRET` Client-Side Inlining:** In the public app codebase, the ORCID OAuth token exchange uses `EXPO_PUBLIC_ORCID_CLIENT_SECRET` directly in the browser (`src/app/orcid-callback.tsx`). In client-side Expo builds, any `EXPO_PUBLIC_` prefixed variable is embedded in the public JavaScript bundle.
* **Resolution Recommendation for Human Review:** Move the ORCID code-for-token exchange to a secure backend endpoint (e.g. Supabase Edge Function) and remove the client secret and its `EXPO_PUBLIC_` prefix from frontend code.

### 2. Non-Blocking Warnings
* **Dependency Version Warning:** `react-native-worklets@0.10.1` is installed while Expo SDK 57 expects `0.5.1`. This does not break static web export.

### 3. Tooling / Network Failures
* **Expo Doctor Package Metadata Timeout:** 1 check encountered a remote network timeout fetching npm package metadata during CLI execution.

---

## 4. Final Verdict

```
======================================================================
  VERDICT: BLOCKED — HUMAN REVIEW REQUIRED
======================================================================
```

*Status: Deployment on hold pending human review of `EXPO_PUBLIC_ORCID_CLIENT_SECRET` client-side bundling in public app OAuth flow.*
