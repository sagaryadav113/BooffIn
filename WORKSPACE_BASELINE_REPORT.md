# WORKSPACE BASELINE & SAFETY REPORT (PHASE 0)

**Timestamp**: 2026-10-08T02:59:00+05:30  
**Branch**: `main`  
**Base Commit SHA**: `26841ce923d37e057017ec0d82a0de00187958de`  
**Git Working Tree**: Clean (all existing working features committed).

---

## 1. System & Engine Baseline

| Component | Status | Verification Detail |
|---|---|---|
| **TypeScript Typecheck** | **CLEAN (Exit 0)** | `npx tsc --noEmit` verified 0 errors |
| **Production Database** | **READ-ONLY** | `https://lvstuqhrmagzqkgwlisl.supabase.co` |
| **Authentication System** | **OPERATIONAL** | Supabase Auth + Google OAuth + Session Persistence + PKCE |
| **Admin Portal** | **OPERATIONAL** | MFA/AAL2 + RBAC + Stage 1/2/3 Security Tests Active |
| **Web Build / Expo Router** | **OPERATIONAL** | SDK 52, Expo Router v4 routes fully indexed |

---

## 2. Route & Navigation Baseline

- **Public Routes**:
  - `/(auth)/welcome` (Home/Marketing/Features/About landing)
  - `/(auth)/login`, `/(auth)/signup`, `/(auth)/email`, `/(auth)/onboarding`, `/(auth)/forgot-password`
  - `/welcome/policy` & `/privacy` (Standalone Legal Privacy Policy)
  - `/welcome/terms` & `/terms` (Standalone Legal Terms of Service)
  - `/auth/callback`, `/orcid-callback`, `/reset-password`
- **In-App Protected Routes**:
  - `/(tabs)/index` (For You / Following Feed + Discussion stream)
  - `/(tabs)/explore` (Hyped papers, OpenAlex streams, topic filters)
  - `/(tabs)/create` (Paper sharing, post creation, discussions)
  - `/(tabs)/notifications` (Activity feed with 14 notification types)
  - `/(tabs)/profile` (Researcher profile, stats, publications)
  - `/paper/[id]`, `/post/[id]`, `/profile/[id]`, `/topic/[slug]`, `/search`, `/settings/*`
  - `/admin/*` (Strict Admin RBAC Portal)

---

## 3. Database & Security Baseline

- **Profiles & Identity**: `public.profiles` with verified badges, academic roles, and ORCID sync.
- **Social Graph**:
  - `public.follows`: Bidirectional follow tracker (`follower_id`, `following_id`).
  - `public.user_blocks`: Active blocker/blocked enforcement with automatic follow severance trigger `trg_handle_user_block`.
  - `public.collaboration_requests`: 1-to-1 proposal requests.
- **Notifications**: `public.notifications` supporting 15 types with real-time delivery and deduplication indexes.
- **Content & Moderation**: `public.posts`, `public.comments`, `public.post_likes`, `public.bookmarks`, `public.content_reports`.
- **Zero-Trust RLS**: All tables have RLS enabled with explicit `auth.uid()` checks.

---

## 4. Safety & Constraint Verification

- **Production DB Safety**: No direct schema modifications, no destructive drops, no unapproved migrations.
- **Absolute Preservation Rule**: All existing user profiles, feeds, bookmarks, post likes, collaboration workflows, search features, settings, and Admin MFA controls remain untouched and protected.
