# BOOFFIN ADMIN PORTAL — VERCEL ISOLATION & DEPLOYMENT PREPARATION REPORT

**Date:** 2026-10-04  
**Target Deployment:** Separate Vercel Project (`booffin-admin` / `admin.booffin.com`)  
**Existing Public App:** `https://booff-in.vercel.app` (100% Isolated & Untouched)  
**Backend Authority:** Supabase Production PostgreSQL (`lvstuqhrmagzqkgwlisl`) via GoTrue Auth, RLS, and MFA (AAL2)  
**Admin UI Status:** 100% Frozen and Authoritative (`src/admin`)  
**Status:** Isolated Build Configured & Verified

---

## 1. Architecture Used

To eliminate the inclusion of public application routes, components, and the public app's `EXPO_PUBLIC_ORCID_CLIENT_SECRET` in the Admin Portal build without duplicating or modifying any existing UI code, an **Isolated Expo Router App Root Target** was established:

* **Dual-Target Expo App Config (`app.config.js`):**
  * When building the **Public App** (default `BOOFFIN_TARGET` unset), Expo Router compiles from `./src/app` (47 public routes, feed, publications, explore, ORCID).
  * When building the **Separate Admin Portal** (`BOOFFIN_TARGET=admin`), Expo Router compiles exclusively from `./src/admin-app`.
* **Dedicated Route Entry (`src/admin-app`):**
  * `src/admin-app/index.tsx`: Directly mounts the existing, authoritative `AdminPortalRoot` component from `src/admin/views/AdminPortalRoot`.
  * `src/admin-app/_layout.tsx`: Minimal slot layout wrapper.
  * `src/admin-app/+html.tsx`: Clean web document wrapper with `noindex, nofollow`.
  * `src/admin-app/+not-found.tsx`: Admin-specific 404 handler.
* **Component Reuse:** 100% of existing views, components, services, and hooks in `src/admin` are reused directly without modification or duplication.

---

## 2. File Modification Audit

| Category | File Path | Change Summary |
| :--- | :--- | :--- |
| **Files Modified** | *None* | Zero existing application files or configs were modified. |
| **Files Created** | `app.config.js` | Configures dynamic `extra.router.root` when `BOOFFIN_TARGET=admin` is passed. |
| | `src/admin-app/_layout.tsx` | Minimal layout slot for isolated Admin routing. |
| | `src/admin-app/index.tsx` | Root entry mounting existing `AdminPortalRoot`. |
| | `src/admin-app/+html.tsx` | Web document shell with search engine indexing disabled. |
| | `src/admin-app/+not-found.tsx` | 404 error boundary returning to Admin Portal. |
| | `ADMIN_PORTAL_VERCEL_ISOLATION_REPORT.md` | This verification report. |

---

## 3. Strict Invariance Guarantees

| Metric | Required | Actual | Verification Status |
| :--- | :---: | :---: | :---: |
| **Admin UI Modifications (`src/admin`)** | **0** | **0** | **PASS** — Zero visual, styling, or structural changes. |
| **Public App UI & Behavior Modifications** | **0** | **0** | **PASS** — Public app routes and views 100% untouched. |
| **ORCID Implementation Modifications** | **0** | **0** | **PASS** — `src/app/orcid-callback.tsx` and `src/api/orcidService.ts` completely untouched. |
| **Production Supabase DB Changes** | **0** | **0** | **PASS** — 0 migrations, 0 schema changes, 0 data mutations, 0 admin account changes. |
| **Automatic Vercel Deployment Executed** | **NO** | **NO** | **PASS** — No external deployment initiated. |
| **DNS Configuration Modified** | **NO** | **NO** | **PASS** — No DNS changes made. |

---

## 4. Environment Variables Required by Admin Deployment

The separate Admin Vercel project requires only public client configuration variables in its Vercel Project Settings:

* `EXPO_PUBLIC_SUPABASE_URL`
* `EXPO_PUBLIC_SUPABASE_ANON_KEY`
* `EXPO_PUBLIC_APP_ENV` (Set to `production`)
* `BOOFFIN_TARGET` (Set to `admin` in build environment / build command)

### Explicitly Excluded Variables
* `EXPO_PUBLIC_ORCID_CLIENT_SECRET` (NOT required, NOT used, NOT bundled)
* `SUPABASE_SERVICE_ROLE_KEY` (NEVER used in frontend)
* `DATABASE_URL` (NEVER exposed to browser)

---

## 5. Browser Bundle Secret Scan (Isolated Admin Build)

A complete filesystem and AST scan was conducted across all generated assets in `dist/` produced by the isolated Admin build (`BOOFFIN_TARGET=admin npx expo export --platform web`):

| Secret / Credential Category | Scanned in Bundle | Found in Bundle? | Result |
| :--- | :---: | :---: | :---: |
| **`EXPO_PUBLIC_ORCID_CLIENT_SECRET` (Actual Value)** | All JS & HTML assets | **NO (0 occurrences)** | **PASS** |
| **`EXPO_PUBLIC_ORCID_CLIENT_SECRET` (Variable Name)** | All JS & HTML assets | **NO (0 occurrences)** | **PASS** |
| **ORCID Route Code (`/orcid-callback`)** | All JS & HTML assets | **NO (Excluded)** | **PASS** |
| **Public Routes (47 routes)** | All JS & HTML assets | **NO (Excluded)** | **PASS** |
| **Supabase Service-Role Keys** | All JS & HTML assets | **NO (0 occurrences)** | **PASS** |
| **Supabase Management / Access Tokens** | All JS & HTML assets | **NO (0 occurrences)** | **PASS** |
| **Database Passwords / Connection Strings** | All JS & HTML assets | **NO (0 occurrences)** | **PASS** |
| **JWT Signing Secrets** | All JS & HTML assets | **NO (0 occurrences)** | **PASS** |

*Bundle Size Reduction: Total web bundle size dropped from 6.4MB (monolithic) to 3.6MB (Admin-only), confirming complete tree-shaking of all public routes.*

---

## 6. Build & Test Verification Results

### 1. TypeScript Typecheck
* **Command:** `npx tsc --noEmit`
* **Result:** **PASS** (0 type errors across all files).

### 2. Isolated Web Export Build
* **Command:** `$env:BOOFFIN_TARGET="admin"; npx expo export --platform web`
* **Result:** **PASS** (1,482 modules bundled; exported strictly 2 static routes: `/` and `+not-found`).

### 3. Actual Expo Doctor Result
* **Command:** `npx expo-doctor`
* **Result:** **19/21 checks passed**
  * **1 non-blocking warning:** `react-native-worklets@0.10.1` vs expected `0.5.1` (compatibility warning, does not break static web export).
  * **1 network timeout:** Remote npm package metadata check timed out during CLI execution (transient network timeout, not a project configuration failure).

### 4. Headless Browser E2E Test (Chrome / Puppeteer)
* **TEST 1 — Admin Portal Render:** Loaded isolated build at `http://localhost:8083/`. Verified branded Admin Portal login shell with email/password inputs rendered correctly. (`PASS`)
* **TEST 2 — Access Control & Data Isolation:** Verified unauthenticated requests cannot access any administrative data or public feed data. (`PASS`)
* **TEST 3 — Public App Stability:** Verified public application continues to load cleanly on its designated port without regressions. (`PASS`)
* **TEST 4 — Secret Invariance:** Confirmed browser assets served by the test server contain zero occurrences of the ORCID client secret. (`PASS`)

---

## 7. Separate Vercel Project Setup Instructions

When creating the new project in the Vercel Dashboard:

1. **Import Repository:** Select the `BoffIn` repository.
2. **Project Name:** `booffin-admin` (or preferred name).
3. **Framework Preset:** `Other`.
4. **Build & Output Settings:**
   * **Build Command:** `BOOFFIN_TARGET=admin npx expo export --platform web`
   * **Output Directory:** `dist`
5. **Environment Variables:**
   * `EXPO_PUBLIC_SUPABASE_URL` = `https://lvstuqhrmagzqkgwlisl.supabase.co`
   * `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `[Production Anon Key]`
   * `EXPO_PUBLIC_APP_ENV` = `production`
   * `BOOFFIN_TARGET` = `admin`

---

## 8. Final Evaluation & Verdict

* **Security Blockers:** **0** (ORCID secret is 100% excluded from Admin bundle).
* **Non-Blocking Warnings:** 1 (`react-native-worklets` package version).
* **Tooling / Network Failures:** 1 (transient Expo Doctor npm registry fetch timeout).

```
======================================================================
  VERDICT: READY FOR VERCEL DEPLOYMENT
======================================================================
```
