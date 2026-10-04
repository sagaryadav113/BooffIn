# BOOFFIN ADMIN PORTAL — DATA MAP & BACKEND ENTITY MAPPING
**Document Version:** 1.0.0 (Stage 1 Architecture)  
**Backend:** Supabase PostgreSQL Database (Single Shared Source of Truth)  
**Status:** STAGE 1 AUDIT & ENTITY MAPPING

---

## 1. Principle of Shared Backend Integration

The BooffIn Admin Portal connects directly to the existing production database schema. It does **NOT** create a shadow database, duplicate tables, or synchronize records into a secondary system. 

```
┌────────────────────────────────────────────────────────┐
│               BooffIn Supabase Backend                │
│         (Auth, PostgreSQL, Storage, RLS)               │
└───────────▲────────────────────────────────▲───────────┘
            │                                │
┌───────────┴──────────┐          ┌──────────┴───────────┐
│ BooffIn Web/App      │          │ BooffIn Admin Portal │
│ (booff-in.vercel.app)│          │ (admin.booffin.com)  │
│ Authenticated Users  │          │ Verified Admins      │
└──────────────────────┘          └──────────────────────┘
```

---

## 2. Comprehensive Entity Mapping

### 2.1 User Management & Identity
| Administrative Concept | Core Backend Table(s) | Key Fields / Relations | Administrative Access Mode |
| :--- | :--- | :--- | :--- |
| **User Identity** | `auth.users` | `id`, `email`, `created_at`, `last_sign_in_at`, `banned_until`, `raw_user_meta_data` | Read-only via Admin RPC / Auth API; status inspection |
| **Academic Profile** | `public.profiles` | `id`, `username`, `full_name`, `avatar_url`, `academic_title`, `institution`, `bio`, `orcid_id`, `orcid_verified`, `followers_count`, `following_count`, `posts_count`, `saved_count` | Read & Moderation (Warning, Name Sanitization, Flagging) |
| **Privacy & Preferences** | `public.user_settings` | `user_id`, `profile_visibility` (`public`, `registered`, `private`), `show_email`, `show_orcid`, `allow_messages_from`, `notify_*` | Read-only privacy verification; cannot forge without audit |
| **Social Graph & Blocks** | `public.follows`, `public.user_blocks` | `follower_id`, `following_id`, `blocker_id`, `blocked_id` | Read-only relationship graph; block inspection |
| **Academic Verification** | `public.scholar_publications` | `id`, `user_id`, `title`, `doi`, `journal`, `publication_year`, `citation_count`, `verification_status` | Verification approval & audit |

### 2.2 Content Moderation & Feed Integrity
| Administrative Concept | Core Backend Table(s) | Key Fields / Relations | Administrative Access Mode |
| :--- | :--- | :--- | :--- |
| **Research Posts** | `public.posts` | `id`, `author_id`, `post_type` (`discussion`, `research_share`, `question`, `insight`), `content`, `paper_id`, `visibility`, `media_urls`, `likes_count`, `comments_count`, `reposts_count` | Read, Content Flagging, Takedown / Hide (Soft delete) |
| **Threaded Comments** | `public.comments` | `id`, `post_id`, `author_id`, `parent_id`, `path` (`ltree`), `content`, `likes_count` | Read, Hierarchy inspection, Comment takedown |
| **Likes & Engagement** | `public.likes`, `public.reposts` | `user_id`, `post_id`, `created_at` | Aggregate metrics, anomaly & bot detection |
| **Saved Items** | `public.bookmarks` | `id`, `user_id`, `post_id`, `paper_id`, `created_at` | Read-only aggregate counts |
| **Collaboration Inquiries**| `public.collaboration_requests` | `id`, `sender_id`, `recipient_id`, `project_title`, `status` (`pending`, `accepted`, `declined`, `withdrawn`) | Moderation of spam inquiries |

### 2.3 Papers, Topics & Scientific Taxonomy
| Administrative Concept | Core Backend Table(s) | Key Fields / Relations | Administrative Access Mode |
| :--- | :--- | :--- | :--- |
| **Canonical Papers** | `public.papers` | `id`, `doi`, `canonical_url`, `title`, `abstract`, `journal`, `publisher`, `publication_date`, `open_access_status`, `open_access_pdf_url`, `citation_count`, `discussion_count` | Read, Metadata Enrichment, DOI Validation |
| **Paper Authors** | `public.paper_authors` | `id`, `paper_id`, `author_name`, `author_order`, `external_author_id` (ORCID/Scopus), `affiliation` | Read, Author Disambiguation |
| **Research Topics** | `public.topics` | `id`, `name`, `slug`, `description`, `icon_name`, `category`, `followers_count`, `posts_count` | Taxonomy Management (Create, Edit, Merge, Curate) |
| **Topic Joins** | `public.paper_topics`, `public.post_topics`, `public.topic_follows` | `paper_id`, `post_id`, `topic_id`, `user_id` | Join index inspection |

### 2.4 Reports, Trust & Safety
| Administrative Concept | Core Backend Table(s) | Key Fields / Relations | Administrative Access Mode |
| :--- | :--- | :--- | :--- |
| **Abuse & Spam Reports** | `public.reports` | `id`, `reporter_id`, `reported_type` (`post`, `comment`, `profile`), `reported_id`, `reason` (`spam`, `harassment`, `misinformation`, `inappropriate`, `copyright`, `other`), `details`, `status` (`pending`, `reviewed`, `dismissed`, `actioned`), `created_at` | Report Triage, Status Mutation (`pending` -> `reviewed`/`actioned`/`dismissed`) with mandatory audit |
| **Notifications** | `public.notifications` | `id`, `recipient_id`, `actor_id`, `notification_type`, `entity_type`, `entity_id`, `message_snippet`, `read_status`, `metadata` | System notification dispatch, alert inspection |
| **Storage Assets** | `storage.objects` (bucket: `profile-media`) | `id`, `bucket_id`, `name`, `owner`, `metadata` | Storage quota auditing, policy-violating image purging |

### 2.5 Admin Layer Tables (Stage 1 Proposed Foundation)
| Administrative Concept | Proposed Admin Table | Key Fields / Relations | Administrative Access Mode |
| :--- | :--- | :--- | :--- |
| **Admin Membership** | `public.admin_members` | `id`, `user_id` (unique ref `auth.users`), `role` (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`), `status` (`INVITED`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`), `invited_by`, `created_at`, `updated_at`, `last_seen_at` | Super Admin management, Auth gate evaluation |
| **Audit Logging** | `public.admin_audit_logs` | `id`, `actor_user_id`, `actor_role`, `action`, `target_type`, `target_id`, `reason`, `approval_id`, `success`, `error_code`, `metadata`, `ip_address`, `created_at` | Append-only audit stream, Super Admin inspection |
| **Dual Approvals** | `public.admin_approval_requests` | `id`, `action_type`, `target_type`, `target_id`, `requested_by`, `reason`, `status`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`, `executed_at`, `created_at`, `expires_at` | Two-person high-risk action approval workflow |

---

## 3. Data Flow Architecture

```
[Admin Web Browser]
        │
        │ 1. Supabase Auth Session (JWT with AAL2 MFA verification)
        ▼
[Admin Authorization Service]
        │
        │ 2. Queries public.admin_members (Validates ACTIVE status & Role)
        ▼
[Server-Side Permission Engine]
        │
        │ 3. Database RLS / SECURITY DEFINER Admin RPCs
        ▼
[Real BooffIn PostgreSQL Tables]
(profiles, posts, comments, reports, papers, user_settings, etc.)
        │
        │ 4. Automatic Append to public.admin_audit_logs
        ▼
[Immutable Audit Trail]
```
