# WORKSPACE SECURITY & ACCESS CONTROL MODEL

**Status**: ACTIVE SECURITY SPECIFICATION  
**Security Level**: Production-Grade Zero-Trust

---

## 1. Zero-Trust Access Matrix

| Workspace Tier | Visibility | Membership Requirement | Message Read Auth | Message Send Auth | Moderation / Inspection |
|---|---|---|---|---|---|
| **DM (1-to-1)** | Private | Mutual Follow (`follows` A↔B) | Only Participant A & B (`status = 'active'`) | Only Participant A & B (`NOT is_blocked(A,B)`) | Server moderation enabled; no third-party access |
| **Community** | Public Metadata / Discoverable | Free Join or Active Paid Tier | Active Members only (`status = 'active'`) | Active Members (`status = 'active'`) | Creator moderation + immutable block reason |
| **Inner Circle** | Private (Invite-Only) | Explicit Follow + Invitation Acceptance | Active Members (Capped at 25) | Active Members (Capped at 25) | Client-side E2EE (Server stores ciphertext; Zero server plaintext access) |

---

## 2. Server-Side Function Security & Atomic Guards

### 2.1 `public.get_or_create_dm_workspace(p_target_user_id UUID)`
- **Execution Mode**: `SECURITY DEFINER SET search_path = public, pg_temp`
- **Validation 1**: `auth.uid() IS NOT NULL AND auth.uid() <> p_target_user_id`
- **Validation 2**: Checks blocking in both directions (`NOT is_blocked(auth.uid(), p_target_user_id)`).
- **Validation 3**: Checks mutual follow:
  ```sql
  EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = p_target_user_id)
  AND
  EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_target_user_id AND following_id = auth.uid())
  ```
- **Validation 4**: Computes deterministic key `LEAST(auth.uid(), p_target_user_id) || ':' || GREATEST(auth.uid(), p_target_user_id)` to guarantee **zero race-condition duplicate DM records**.
- **Atomic Insertion**: Inserts workspace + inserts active members for both users within a single transaction.

---

## 3. Row-Level Security (RLS) Policy Declarations

### `public.workspaces`
- **SELECT**:
  ```sql
  type = 'community'
  OR (type IN ('dm', 'inner_circle') AND EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND status = 'active'
  ))
  ```
- **INSERT**: Authenticated users can create communities/inner circles, or call `get_or_create_dm_workspace` for DMs.
- **UPDATE / DELETE**: Only `creator_id = auth.uid()`.

### `public.workspace_messages`
- **SELECT**:
  ```sql
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_messages.workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
  ```
- **INSERT**:
  ```sql
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = workspace_messages.workspace_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
  ```

### `public.workspace_blocks`
- **SELECT**: Blocker, blocked user (to view block reason banner), or community owner.
- **INSERT / DELETE**: Workspace owner / creator only.
