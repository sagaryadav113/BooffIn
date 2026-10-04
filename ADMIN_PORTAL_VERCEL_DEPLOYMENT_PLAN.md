# BOOFFIN ADMIN PORTAL — SEPARATE VERCEL DEPLOYMENT PLAN

**Target Project:** BooffIn Admin Portal  
**Primary URL:** `https://<admin-portal-project>.vercel.app`  
**Future Custom Domain:** `https://admin.booffin.com`  
**Existing Public App:** `https://booff-in.vercel.app` (Completely untouched & isolated)  
**Backend Authority:** Supabase PostgreSQL (`lvstuqhrmagzqkgwlisl`) via GoTrue Auth, RLS, and MFA (AAL2)  
**Status:** Prepared for separate Vercel deployment (Awaiting human approval)

---

## 1. Architecture & Deployment Separation

### Public Application (Untouched)
* **Vercel Project:** `booff-in` (or existing production project name)
* **Domain:** `https://booff-in.vercel.app`
* **Entry Point:** Public BooffIn Web Bundle (`/` -> Feed, explore, profile, publications)
* **Configuration:** Standard `vercel.json`

### Admin Portal (New Separate Project)
* **Vercel Project:** `booffin-admin` (or dedicated name created in Vercel)
* **Domain:** `https://<admin-portal-project>.vercel.app` / `https://admin.booffin.com`
* **Entry Point:** Admin Portal Route (`/admin` and root `/` routing directly to `/admin`)
* **Logical Separation:** Independent build pipeline, environment variable scope, deployment logs, and domain bindings.

```text
                        ┌─────────────────────────────────────────┐
                        │          GitHub Repository               │
                        │             (main branch)               │
                        └────────────────────┬────────────────────┘
                                             │
                    ┌────────────────────────┴────────────────────────┐
                    │                                                 │
                    ▼                                                 ▼
     ┌─────────────────────────────┐                   ┌─────────────────────────────┐
     │    Public Vercel Project    │                   │     Admin Vercel Project    │
     │   (https://booff-in...)     │                   │   (https://admin.booffin...)│
     │                             │                   │                             │
     │  Entry: / (Public Feed)     │                   │  Entry: /admin (Admin Shell)│
     │  Uses: vercel.json          │                   │  Uses: Project Settings     │
     └──────────────┬──────────────┘                   └──────────────┬──────────────┘
                    │                                                 │
                    │               Supabase Production               │
                    └───────────────────────┬─────────────────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │  lvstuqhrmagzqkgwlisl   │
                               │   Postgres RLS / MFA    │
                               └─────────────────────────┘
```

---

## 2. Vercel Project Build & Framework Settings

When creating the new project in the Vercel Dashboard for the Admin Portal:

| Setting | Value | Rationale |
| :--- | :--- | :--- |
| **Project Name** | `booffin-admin` (or preferred name) | Logical separation from public app |
| **Framework Preset** | `Other` (or `None`) | Managed purely via Expo Static Export |
| **Root Directory** | `./` | Root of repository |
| **Install Command** | `npm install` | Clean dependency installation |
| **Build Command** | `npx expo export --platform web` | Produces production static web bundle in `dist/` |
| **Output Directory** | `dist` | Destination of Expo Web export |
| **Node.js Version** | `20.x` or `22.x` | Modern LTS standard |

---

## 3. Required Environment Variables

Configure these variables in the **Vercel Project Settings > Environment Variables** for the Admin project:

### Public Client Configuration (Safe for Browser Bundle)
* `EXPO_PUBLIC_SUPABASE_URL`
* `EXPO_PUBLIC_SUPABASE_ANON_KEY`
* `EXPO_PUBLIC_APP_ENV` (Set to `production`)

### Environment Variable Matrix

| Variable Name | Environment Scope | Exposure Classification | Value Description |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Production, Preview, Development | Public Client | Production Supabase HTTPS URL (`https://lvstuqhrmagzqkgwlisl.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development | Public Client | Production Supabase Publishable / Anon Key |
| `EXPO_PUBLIC_APP_ENV` | Production | Public Client | `production` |

### Explicit Security Rules
* **NO** `SUPABASE_SERVICE_ROLE_KEY`
* **NO** `SUPABASE_ACCESS_TOKEN`
* **NO** `DATABASE_URL`
* **NO** `TOTP_SECRET` or raw auth credentials

---

## 4. Root Path Routing & Redirect Configuration

On the dedicated Admin domain (`https://admin.booffin.com`), users navigating to the root URL `/` should be directed seamlessly to `/admin`.

This can be handled cleanly via **Vercel Project Settings > Rewrites & Redirects** or by specifying a redirect rule in Vercel:

```json
{
  "redirects": [
    {
      "source": "/",
      "destination": "/admin",
      "permanent": false
    }
  ]
}
```

This guarantees that:
1. Navigating to `https://admin.booffin.com/` immediately opens the Admin Login / Shell.
2. Direct deep links (`https://admin.booffin.com/admin`) load normally.
3. The public application repository files and public Vercel project remain 100% unaltered.

---

## 5. Security & Authorization Enforcement

1. **Authentication:** Standard Supabase GoTrue Auth with email and password.
2. **Access-Denied Interception:** Non-admin accounts attempting access are blocked immediately at the auth gate.
3. **MFA / AAL2 Enforcement:** Admins with enrolled TOTP factors are required to complete the 6-digit challenge (`AdminMfaView`) before reaching dashboard telemetry or management tables.
4. **Backend Security Authority:** All data queries (`profiles`, `posts`, `content_reports`, `admin_members`, `audit_logs`) execute against PostgreSQL Row Level Security (RLS) policies and security-definer procedures.
5. **Secret Protection:** Ephemeral TOTP secrets generated during enrollment are kept in-memory and wiped on component unmount; zero tokens or secrets are logged.

---

## 6. Step-by-Step Deployment Procedure (When Approved)

1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New... > Project**.
3. Import the `BoffIn` Git repository.
4. Set Project Name to `booffin-admin`.
5. Under **Build and Output Settings**:
   * Build Command: `npx expo export --platform web`
   * Output Directory: `dist`
6. Under **Environment Variables**, add:
   * `EXPO_PUBLIC_SUPABASE_URL`
   * `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   * `EXPO_PUBLIC_APP_ENV=production`
7. Click **Deploy**.
8. In Project Settings > Domains, attach `admin.booffin.com` (when custom DNS configuration is scheduled).
