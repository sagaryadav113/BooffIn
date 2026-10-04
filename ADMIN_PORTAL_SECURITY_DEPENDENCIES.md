# BOOFFIN ADMIN PORTAL — SECURITY DEPENDENCIES & BASELINE AUDIT
**Document Version:** 1.0.0 (Stage 1 Architecture)  
**Target Backend:** Supabase PostgreSQL & Auth (Live Project: `lvstuqhrmagzqkgwlisl.supabase.co`)  
**Status:** STAGE 1 AUDIT & INTEGRITY BASELINE

---

## 1. Executive Summary & Security Oath

The BooffIn Admin Portal is a separate administrative interface that operates directly on real BooffIn backend services and data. Under no circumstances may the Admin Portal weaken, bypass, or regress the existing security boundaries, row-level security (RLS) policies, database triggers, or encryption controls implemented across the BooffIn platform.

This document establishes the **authoritative security dependency baseline** (spanning P0, P1, and P2 security remediations) that the Admin Portal must preserve unconditionally.

---

## 2. P0 Security Baseline (Critical Privacy, Account Deletion & Storage Boundary)

### 2.1 Atomic Account Deletion (`delete_user_account`)
* **Database Function:** `public.delete_user_account()` (SECURITY DEFINER, `SET search_path = public, auth, storage, pg_temp`)
* **Migration Reference:** `20261002000001_p0_security_remediation.sql`
* **Protection Invariant:**
  1. Transactional cleanup of storage objects in bucket `profile-media` using `storage.allow_delete_query`.
  2. Storage cleanup failure aborts the transaction (non-swallowed error handling), preventing orphaned storage blobs.
  3. Deletion cascades from `auth.users` down to `profiles`, `user_settings`, `posts`, `comments`, `likes`, `reposts`, `follows`, `user_blocks`, `reports`, `notifications`, `bookmarks`, `collaboration_requests`.
* **Admin Portal Rule:** Single administrators must **NEVER** execute direct unilateral account deletions on behalf of users without two-person cryptographic approval (`admin_approval_requests` two-admin rule).

### 2.2 Profile Privacy Boundary (`get_user_profile` & `get_user_profile_visibility`)
* **Database Functions:**
  - `public.get_user_profile(p_user_id UUID, p_username TEXT)` (SECURITY DEFINER, `SET search_path = public, pg_temp`)
  - `public.get_user_profile_visibility(p_user_id UUID)` (STABLE SECURITY DEFINER, fail-closed defaulting to `'private'`)
* **Protection Invariant:**
  - Resolves privacy setting (`public`, `registered`, `private`) from `user_settings`.
  - Blocks direct access to protected fields (`department`, `lab_group`, `degree_program`, `graduation_year`, `google_scholar_url`, `researchgate_url`, `linkedin_url`, `scopus_id`) for unauthorized viewers.
  - Direct PostgREST table SELECT is constrained by `"Profiles privacy read policy"`.
* **Admin Portal Rule:** Admin services querying user details for moderation/support must use dedicated server-authorized administrative RPCs that log access in `admin_audit_logs`, rather than exposing unrestricted read queries to client browsers.

### 2.3 Storage Object Protection
* **Storage Bucket:** `profile-media` (Public read, authenticated write restricted to folder name = `auth.uid()`).
* **Protection Invariant:**
  - File size restricted to <= 10MB (`10485760` bytes).
  - MIME type limited to `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
  - Users cannot overwrite or delete files in other users' storage prefixes.
* **Admin Portal Rule:** Administrative avatar/banner removal must be performed via authenticated administrative purge RPCs with complete audit logging.

---

## 3. P1 Security Baseline (Blocking, Social Severs & Notification Enforcement)

### 3.1 Mutual Social Graph Blocking (`user_blocks`)
* **Table:** `public.user_blocks (blocker_id, blocked_id)`
* **Trigger:** `trg_handle_user_block` -> `public.fn_handle_user_block()`
* **Protection Invariant:**
  1. Blocking instantly deletes mutual follow records in `public.follows` (automatically syncing `following_count` and `followers_count` via triggers).
  2. Terminate active or pending `public.collaboration_requests` with status `'withdrawn'`.
  3. `toggle_follow()` and `toggle_follow_user_v2()` reject follow requests between blocked pairs.
  4. RLS policies on `posts`, `comments`, `likes`, `reposts`, `follows`, `collaboration_requests` filter out content from blockers/blocked users.
  5. `get_user_profile()` returns `is_blocked = true` with masked metadata when a block relationship exists.
* **Admin Portal Rule:** Admin portal user management must preserve block integrity. Admin inspectors can observe block relationships in moderation views but cannot forge block bypasses on user feeds.

### 3.2 Notification Suppression & Privacy
* **Triggers:** `fn_notify_on_like`, `fn_notify_on_comment`, `fn_notify_on_repost`, `fn_notify_on_follow`, `fn_notify_on_collaboration_request`.
* **Protection Invariant:**
  - Checks recipient's notification preferences in `user_settings` (`notify_likes`, `notify_comments`, `notify_reposts`, `notify_follows`, `notify_mentions`, `notify_collaborations`).
  - Completely suppresses notifications between blocked pairs.
  - Prevents self-notification.
* **Admin Portal Rule:** System-wide or administrative notifications generated by admins must have explicit type `'system'` and must not trigger unauthorized push alerts.

---

## 4. P2 Security Baseline (Immutable Columns, Counter Integrity & RLS Hardening)

### 4.1 Server-Controlled Column Protection Triggers
* **Triggers:**
  - `trg_protect_profile_immutable_columns` on `public.profiles`
  - `trg_protect_post_counter_columns` on `public.posts`
  - `trg_protect_comment_counter_columns` on `public.comments`
* **Protection Invariant:**
  - When `pg_trigger_depth() = 1` (direct client API call), users **cannot** forge counters (`followers_count`, `following_count`, `posts_count`, `saved_count`, `likes_count`, `comments_count`, `reposts_count`, `replies_count`), IDs, or timestamps (`created_at`).
  - `orcid_verified` cannot be set to `true` without a valid canonical ORCID ID regex match (`^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$`).
* **Admin Portal Rule:** Admin updates to user profiles or content must never bypass counter triggers. Recalculations (if needed) must execute through verified maintenance RPCs.

### 4.2 Duplicate Report Prevention (`uq_reports_pending`)
* **Index:** `uq_reports_pending` on `public.reports (reporter_id, reported_type, reported_id) WHERE status = 'pending'`
* **Protection Invariant:** Prevents spam reporting attacks by allowing at most one active pending report per reporter per entity.
* **Admin Portal Rule:** Admin moderation workflows transitioning reports (`pending` -> `reviewed` / `actioned` / `dismissed`) must log the moderator ID, timestamp, and resolution action in `admin_audit_logs`.

### 4.3 Notification Cleanup Triggers
* **Triggers:** `trg_cleanup_post_notifications` on `posts`, `trg_cleanup_comment_notifications` on `comments`.
* **Protection Invariant:** Deleting a post or comment automatically purges all related notifications, preventing broken links or orphaned notification rows.

### 4.4 SECURITY DEFINER Function `search_path` Hardening
* **Protection Invariant:** Every SECURITY DEFINER function in the database strictly sets `SET search_path = public, pg_temp` (or explicit schema list `public, auth, storage, pg_temp`) to prevent search path poisoning attacks.
* **Admin Portal Rule:** All admin helper RPCs (`is_admin`, `get_admin_role`, `has_admin_permission`, `record_admin_audit_log`, etc.) must explicitly define `SET search_path = public, pg_temp`.

---

## 5. Summary Matrix of Required Preservation

| Security Layer | Existing Mechanism | Preservation Requirement in Admin Portal |
| :--- | :--- | :--- |
| **P0: Account Deletion** | `delete_user_account()` RPC | Two-admin approval required; no unilateral browser delete |
| **P0: Profile Privacy** | `get_user_profile()` RPC & RLS | Admin queries must be server-authorized & audited |
| **P0: Storage** | Folder-scoped RLS on `profile-media` | Admin file purges must be logged and authenticated |
| **P1: Blocking** | `user_blocks` + auto-sever trigger | Cannot force connections or unblock without audit |
| **P1: Notifications** | `user_settings` preference gates | Admin broadcasts must respect system channels |
| **P2: Column Protection** | Immutability triggers | Client cannot alter counters or system columns |
| **P2: Report Anti-Spam** | `uq_reports_pending` unique index | Status transitions must record moderator metadata |
| **P2: Function Hardening**| Fixed `search_path = public, pg_temp` | All admin RPCs must declare hardened `search_path` |
