# WORKSPACE ARCHITECTURE AUDIT (PHASE 1)

**Status**: AUDIT COMPLETE — WAITING FOR ARCHITECTURE APPROVAL  
**Date**: October 2026  
**Auditor**: Antigravity Engineering

---

## 1. Existing Relevant Tables

| Table | Purpose & Columns | Status for Workspace |
|---|---|---|
| `public.profiles` | `id`, `full_name`, `handle`, `academic_title`, `institution`, `research_interests`, `avatar_url`, `is_verified` | **Reuse Directly** for creator profiles & DM participant display. |
| `public.follows` | `follower_id`, `following_id`, `created_at` (Primary Key: `follower_id, following_id`) | **Reuse Directly** to compute mutual follows (`A follows B AND B follows A`). |
| `public.user_blocks` | `blocker_id`, `blocked_id`, `created_at` (Primary Key: `blocker_id, blocked_id`) | **Reuse Directly** for platform-level DM and interaction blocking. |
| `public.notifications` | `id`, `recipient_id`, `actor_id`, `notification_type`, `entity_type`, `entity_id`, `message_snippet`, `metadata`, `read_status`, `created_at` | **Extend Check Constraints** to support workspace notification types. |
| `public.collaboration_requests` | `id`, `sender_id`, `recipient_id`, `topic`, `message`, `status`, `created_at` | **Preserve Intact** — DM and Inner Circle will complement, not overwrite proposals. |
| `public.content_reports` | `id`, `reporter_id`, `reported_user_id`, `content_type`, `content_id`, `reason`, `status` | **Extend Content Types** for community & E2EE reported messages. |
| `public.support_tickets` & `public.admin_team_messages` | Internal support & admin ops chat | **Preserve Intact** — Completely isolated from end-user workspaces. |

---

## 2. Existing Relevant Database Functions

- `public.fn_handle_user_block()`: Trigger function on `public.user_blocks` that automatically terminates follows & active collaboration requests upon a block.
- `public.is_blocked(uid1, uid2)`: Checks bidirectional blocking status between two users.
- `public.is_admin()`: Verifies if `auth.uid()` has admin privileges (used in Admin Portal).
- `public.delete_user_account()`: Secure account teardown RPC.

---

## 3. Existing Relevant RLS Policies

- `public.user_blocks`: `auth.uid() = blocker_id` for insert/delete.
- `public.notifications`: `recipient_id = auth.uid()` for select/update.
- `public.follows`: `auth.uid() = follower_id` for insert/delete; open select for follower lists.
- `public.profiles`: Public read for profile info; `auth.uid() = id` for updates.

---

## 4. Existing Relevant Frontend Modules

- [`src/components/desktop/DesktopMessagesDock.tsx`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/src/components/desktop/DesktopMessagesDock.tsx): Currently renders a "Community & DMs" popup dock listing collaboration requests. We will evolve this into the canonical desktop Workspace dock.
- [`src/components/layout/AppHeader.tsx`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/src/components/layout/AppHeader.tsx): Header on mobile. The top-right `+` button will be replaced with the Workspace icon badge.
- [`src/components/profile/ProfileHeader.tsx`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/src/components/profile/): Profile screen containing Follow/Edit buttons. We will add the mutual-follow aware "Message" button here.
- [`src/store/useAuthStore.ts`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/src/store/useAuthStore.ts): Tracks authenticated user, following IDs (`followingIds: Set<string>`).
- [`src/store/useNotificationStore.ts`](file:///c:/Users/pooja/OneDrive/Desktop/BoffIn/src/store/useNotificationStore.ts): Manages real-time badge counts and notifications.

---

## 5. Existing Notification Architecture

- `public.notifications` handles deduplication, unread counts, and real-time Supabase subscriptions.
- Notification types are enforced via `CHECK (notification_type IN (...))`.
- **Extension Strategy**: Add `workspace_invitation`, `workspace_message`, `workspace_event`, `workspace_block`, `subscription_active`.

---

## 6. Existing Blocking Architecture

- Blocking between User A and User B automatically severs any mutual follow via `trg_handle_user_block`.
- Because DMs strictly require an active mutual follow, blocking immediately revokes the ability to send new DMs without requiring redundant trigger logic.

---

## 7. Existing Follow Architecture

- Follows are stored in `public.follows (follower_id, following_id)`.
- Mutual follow verification can be evaluated server-side in constant time via:
  ```sql
  EXISTS (SELECT 1 FROM public.follows WHERE follower_id = user_a AND following_id = user_b)
  AND
  EXISTS (SELECT 1 FROM public.follows WHERE follower_id = user_b AND following_id = user_a)
  ```

---

## 8. Existing Reusable UI Components

- **Typography & Layout**: `Typography`, `Card`, `Badge`, `Avatar`, `Button`, `Divider`, `Icon`.
- **Modal Framework**: `BottomSheetModal`, `DangerActionModal`, `QuickOAuthModal`.
- **Feed & DOI Components**: `TopicChip`, `ArticleStatsView`, `InAppPaperPdfViewer`.

---

## 9. Potential Conflicts & Deduplication

- **Conflict 1 (Duplicate DM Rows)**: Two users initiating a conversation simultaneously could produce race-condition duplicates.
  - *Mitigation*: Create a canonical deterministic lookup key or unique constraint `(LEAST(member_a, member_b), GREATEST(member_a, member_b))` for 1-to-1 DMs.
- **Conflict 2 (Collaboration Proposals vs DMs)**: Proposals are formal scientific pitches; DMs are real-time conversations.
  - *Mitigation*: Keep `public.collaboration_requests` intact. When a collaboration request is accepted and mutual follow is established, allow instant jump to DM Workspace.

---

## 10. Recommended Component & Architecture Reuse

- **Do NOT create separate messaging databases**: Use a single canonical `workspaces` table with `workspace_type` enum (`dm`, `community`, `inner_circle`).
- **Reuse `public.profiles`**: No duplicated user metadata.
- **Reuse `public.notifications`**: Single bell icon with unified badge counter.

---

## 11. Required New Database Objects (For Staged Implementation)

```sql
-- 1. Workspace Types Enum
CREATE TYPE public.workspace_type AS ENUM ('dm', 'community', 'inner_circle');
CREATE TYPE public.workspace_member_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE public.workspace_subscription_tier AS ENUM ('tier_49', 'tier_119', 'tier_219', 'tier_599');

-- 2. Unified Workspaces Core
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.workspace_type NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  topic_tag TEXT,
  pricing_tier public.workspace_subscription_tier,
  price_inr INTEGER,
  max_members INTEGER DEFAULT 25, -- Hard limit for Inner Circle
  e2ee_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Workspace Memberships
CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.workspace_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'removed', 'blocked')),
  UNIQUE (workspace_id, user_id)
);

-- 4. Workspace Messages (Plaintext for Community/DM, Ciphertext for Inner Circle)
CREATE TABLE public.workspace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- Ciphertext string if E2EE, formatted text if Community/DM
  doi_reference TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  key_epoch INTEGER DEFAULT 1, -- For E2EE key rotation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Community Moderation & Blocks
CREATE TABLE public.workspace_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  blocked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_type TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, blocked_user)
);

-- 6. Inner Circle Calendar & Opportunities
CREATE TABLE public.workspace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location_or_url TEXT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 12. Required New Frontend Modules

- `src/app/workspace/index.tsx`: Main Hub (DMs, Communities, Inner Circles, Creation Modal).
- `src/app/workspace/[id].tsx`: Workspace detail screen routing between DM conversation, Community tabs, and Inner Circle pod.
- `src/components/workspace/WorkspaceDMView.tsx`: Real-time 1-to-1 chat view.
- `src/components/workspace/WorkspaceCommunityView.tsx`: 5-tab Community layout (Papers, Discussions, Podcasts, Live, Settings).
- `src/components/workspace/WorkspaceInnerCircleView.tsx`: Discussions, Calendar, Roles/Opportunities, Saved Items.
- `src/components/workspace/CreateWorkspaceModal.tsx`: Creation modal for DM, Community, or Inner Circle.
- `src/store/useWorkspaceStore.ts`: Unified Zustand store for active conversations, unread badges, and subscriptions.

---

## 13. Security & Cryptographic Risks

1. **Client Trust Risk**: Client must never be able to forge membership or send messages into a workspace they don't belong to.
   - *Defense*: RLS policy `USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND status = 'active'))`.
2. **E2EE Integrity**: Cryptography must never rely on server keys.
   - *Defense*: Phase 6 dedicated E2EE design using Web Crypto / mature audited client-side key exchange and epoch-based key rotation on member departure.
3. **Price Manipulation**: Client attempting to tamper with subscription prices.
   - *Defense*: Strict server-side verification of allowed fixed tiers (₹49, ₹119, ₹219, ₹599).

---

## 14. Migration Risks & Safety

- **Risk Level**: Zero for existing tables (no columns deleted or renamed).
- **Rollback Strategy**: All new tables are cleanly namespaced with `workspace_*` and can be dropped without affecting posts, follows, profiles, or authentication.
