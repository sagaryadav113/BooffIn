# BooffIn Workspace — Production Deployment & Rollout Plan

## 1. Executive Summary
The **BooffIn Workspace** subsystem introduces an end-to-end research collaboration platform with 3 tiers:
1. **1-to-1 Direct Researcher Messaging (DM)**: Zero-duplicate canonical channels strictly enforced by Postgres RPC requiring mutual follows.
2. **Research Communities**: Discoverable public or monetized communities with 5 specialized tabs (Papers [DOI], Discussions, Podcasts, Live Sessions, Settings) and transparent moderation.
3. **Inner Circle Pods**: Confidential collaboration pods strictly capped at 25 members with End-to-End Encryption (E2EE), Calendar, Roles & Opportunities, and a Shared Vault.

---

## 2. Pre-Deployment Verification Checklist
- [x] **Zero TypeScript Errors**: Verified clean build via `npx tsc --noEmit`.
- [x] **Zero Regressions**: Core feeds, ORCID verification, academic profiles, search, explore, settings, and Admin Portal intact.
- [x] **Database Migration Created**: `supabase/migrations/20261008000001_booffin_workspace_system.sql` containing all 7 tables, enums, triggers, and atomic RPCs.
- [x] **Row-Level Security (RLS)**: Enforced Zero-Trust security policies on all workspace tables.
- [x] **UI Polish**: AppHeader top-right `+` button cleanly replaced by BooffIn Workspace entry button with real-time unread badges.

---

## 3. Deployment Steps

### Step 1: Execute Supabase Database Migration
Execute `supabase/migrations/20261008000001_booffin_workspace_system.sql` in the Supabase Production SQL Editor or via Supabase CLI:
```bash
supabase db push
# or run the SQL file in the Supabase Dashboard SQL Editor
```

### Step 2: Verify Database Functions & Triggers
Run verification query:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'get_or_create_dm_workspace';
```

### Step 3: Frontend Deployment (Vercel / EAS Build)
1. **Web (PWA & Desktop)**: Deploy to Vercel/production host.
2. **Mobile (iOS & Android)**:
   ```bash
   npx expo export
   # or build with EAS
   eas build --platform all --profile production
   ```

---

## 4. Post-Deployment Smoke Tests
1. **DM Flow**:
   - Open researcher profile -> Tap "Message".
   - Verify that if mutual follow is absent, a clear informative prompt is displayed.
   - Verify that when mutual follow is present, a canonical workspace is opened with zero duplicates.
2. **DOI Sharing**:
   - Paste DOI `10.1038/s41586-021-03819-2` in chat.
   - Verify that title, authors, journal, and citation badge render accurately.
3. **Inner Circle 25 Limit**:
   - Create Inner Circle -> Attempt to invite 26th member -> Verify hard limit error.
4. **Transparent Moderation**:
   - Moderate/ban a member -> Ensure mandatory reason is logged and visible to banned user and community log.
