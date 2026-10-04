# BOOFFIN PRODUCTION DOMAIN & VERCEL DEPLOYMENT GUIDE

**Production Domain:** `letsbooffin.com`  
**Admin Portal Domain:** `admin.letsbooffin.com`  
**Business Email:** `admin@letsbooffin.com`  
**DNS Registrar:** GoDaddy  
**Hosting Provider:** Vercel (Dual Isolated Projects)  
**Database & Auth Authority:** Supabase Production (`lvstuqhrmagzqkgwlisl`)

---

## 1. Production Architecture Overview

```text
                                  GoDaddy DNS (letsbooffin.com)
                                                │
                  ┌─────────────────────────────┼─────────────────────────────┐
                  │                             │                             │
                  ▼                             ▼                             ▼
        [ A / CNAME Records ]          [ CNAME Record ]              [ MX / TXT Records ]
         @ / www.letsbooffin.com      admin.letsbooffin.com         admin@letsbooffin.com
                  │                             │                             │
                  ▼                             ▼                             ▼
         Vercel Project 1              Vercel Project 2                Email Provider
        (Public BooffIn App)          ("booffin-admin")            (GoDaddy M365 / Google)
                  │                             │
                  └──────────────┬──────────────┘
                                 │
                                 ▼
                     Supabase Production Auth & DB
```

---

## 2. GoDaddy DNS Configuration Checklist

Log in to your **GoDaddy Domain Portfolio > letsbooffin.com > DNS**.

### A. Records for Public Application (`letsbooffin.com` & `www.letsbooffin.com`)

| Type | Name / Host | Value / Target | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | 1 Hour (or Default) | Directs apex domain `letsbooffin.com` to Public Vercel project |
| **CNAME** | `www` | `cname.vercel-dns.com.` | 1 Hour (or Default) | Directs `www.letsbooffin.com` to Public Vercel project |

### B. Record for Admin Portal (`admin.letsbooffin.com`)

| Type | Name / Host | Value / Target | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **CNAME** | `admin` | `cname.vercel-dns.com.` | 1 Hour (or Default) | Directs `admin.letsbooffin.com` to `booffin-admin` Vercel project |

### C. Important Rules for GoDaddy DNS Safety
* **DO NOT delete or change Nameservers** unless you explicitly intend to migrate DNS hosting. Keep standard GoDaddy nameservers.
* **DO NOT delete any existing MX or TXT records** related to your email.
* Adding the `A` record for `@` and `CNAME` records for `www` and `admin` will **NOT** disrupt email services.

---

## 3. Vercel Public Project Setup (`letsbooffin.com`)

If using your existing public project on Vercel:

1. Navigate to your **Public Project** on the Vercel Dashboard.
2. Go to **Settings > Domains**.
3. Add `letsbooffin.com` (Vercel will recommend adding `www.letsbooffin.com` with a redirect; accept this recommendation).
4. Verify that the build settings remain default:
   * **Framework Preset:** `Other`
   * **Build Command:** `npx expo export --platform web`
   * **Output Directory:** `dist`
5. Ensure environment variables include:
   * `EXPO_PUBLIC_SUPABASE_URL`
   * `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   * `EXPO_PUBLIC_APP_ENV=production`

---

## 4. Vercel Admin Portal Setup (`admin.letsbooffin.com`)

Create a dedicated, isolated project for the Admin Portal:

1. Click **Add New... > Project** on Vercel.
2. Import the `BoffIn` repository.
3. Set **Project Name** to `booffin-admin`.
4. Under **Build and Output Settings**:
   * **Build Command:** `npx expo export --platform web` (or leave default)
   * **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   * `BOOFFIN_TARGET` = `admin` *(Crucial: Instructs Expo to compile exclusively from `src/admin-app`, excluding all public routes and ORCID secrets)*
   * `EXPO_PUBLIC_SUPABASE_URL` = `https://lvstuqhrmagzqkgwlisl.supabase.co`
   * `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `[Your Production Publishable/Anon Key]`
   * `EXPO_PUBLIC_APP_ENV` = `production`
6. Click **Deploy**.
7. Once deployed, go to **Settings > Domains** in the `booffin-admin` project.
8. Add `admin.letsbooffin.com`.

---

## 5. Business Email Setup (`admin@letsbooffin.com`)

Purchasing a domain provides the right to the domain name, but email routing requires an active mailbox service:

1. **Activate Mailbox Provider:** If you purchased Microsoft 365 or email hosting through GoDaddy, log in to your GoDaddy account and complete the mailbox setup for `admin@letsbooffin.com`. (If using Google Workspace or another host, configure through their setup wizard).
2. **Email DNS Records:** Your email provider will generate specific DNS records that must be saved in GoDaddy:
   * **MX Records:** (e.g. `letsbooffin-com.mail.protection.outlook.com` for M365 or `smtp.secureserver.net`).
   * **TXT Records (SPF):** (e.g. `v=spf1 include:secureserver.net -all` or `v=spf1 include:spf.protection.outlook.com -all`).
   * **CNAME Records (DKIM):** Provided by your email provider for message signing.
   * **TXT Record (DMARC):** (e.g. `v=DMARC1; p=none; rua=mailto:admin@letsbooffin.com`).
3. **Coexistence:** These email records operate alongside Vercel's web records without conflict.

---

## 6. Supabase Authentication URL Configuration

To ensure seamless authentication, MFA verification, and password resets from both domains, update your Supabase Dashboard:

1. Go to **Supabase Dashboard > Authentication > URL Configuration**.
2. **Site URL:** Set to `https://letsbooffin.com`.
3. **Redirect URLs (Allowed Callback URLs):** Add the following exact entries:
   * `https://letsbooffin.com/**`
   * `https://www.letsbooffin.com/**`
   * `https://admin.letsbooffin.com/**`
   * `https://booff-in.vercel.app/**` (For Vercel preview deployments)
   * `http://localhost:8081/**` (For local development)
   * `http://localhost:8082/**` (For local admin testing)
4. Click **Save**.

---

## 7. Post-Configuration Verification Checklist

Once DNS records have propagated (typically 5–30 minutes):

* [ ] Visit `https://letsbooffin.com` — Public BooffIn app loads feed and publications.
* [ ] Visit `https://www.letsbooffin.com` — Properly redirects or renders public app.
* [ ] Visit `https://admin.letsbooffin.com` — Admin Portal Login screen renders; zero public routes or feed data are exposed.
* [ ] Log in with `sagaryadav1062@gmail.com` on `https://admin.letsbooffin.com` — Prompts for 6-digit TOTP MFA and unlocks the Admin Console.
* [ ] Send a test email to `admin@letsbooffin.com` and reply from the mailbox to confirm bidirectional email flow.
