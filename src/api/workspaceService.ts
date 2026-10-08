import { supabase } from './client';
import { fetchUserProfile } from './authService';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceBlock,
  WorkspaceEvent,
  WorkspaceRoleOpportunity,
  WorkspaceSavedItem,
  WorkspaceSubscriptionTier,
  WorkspaceType,
  WorkspaceMessageType,
  WorkspaceAudioMetadata,
  WorkspacePostMetadata,
  WorkspaceProfileMetadata,
  WorkspaceInviteMetadata,
  WorkspaceDocumentMetadata,
  WorkspaceCallMetadata,
  DoiMetadata,
  WorkspaceSummaryStats,
} from '../types/workspace';
import { resolvePaper } from './paperResolver';

const TIER_PRICES: Record<WorkspaceSubscriptionTier, number> = {
  free: 0,
  tier_49: 49,
  tier_119: 119,
  tier_219: 219,
  tier_599: 599,
};

export const workspaceService = {
  /**
   * Fetch all active workspaces for a user (DMs, joined Communities, Inner Circles)
   * plus discoverable public communities.
   */
  async getWorkspaces(userId: string): Promise<{
    dms: Workspace[];
    communities: Workspace[];
    innerCircles: Workspace[];
    discoverableCommunities: Workspace[];
    error: string | null;
  }> {
    try {
      // 1. Fetch DMs directly from workspaces table
      const { data: dmRows } = await supabase
        .from('workspaces')
        .select('*')
        .eq('type', 'dm')
        .or(`dm_participant_a.eq.${userId},dm_participant_b.eq.${userId},creator_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      // 2. Fetch all user memberships
      const { data: memberRows } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, status, is_muted, unread_count, last_read_at, joined_at')
        .eq('user_id', userId)
        .eq('status', 'active');

      const memberMap = new Map<string, any>();
      const joinedWorkspaceIds = new Set<string>();

      (memberRows || []).forEach((m: any) => {
        memberMap.set(m.workspace_id, m);
        joinedWorkspaceIds.add(m.workspace_id);
      });

      // 3. Fetch community and inner circle workspaces
      const otherWorkspaceIds = (memberRows || [])
        .map((m: any) => m.workspace_id)
        .filter((id: string) => !(dmRows || []).some((dm: any) => dm.id === id));

      let otherWorkspaces: any[] = [];
      if (otherWorkspaceIds.length > 0) {
        const { data: nonDmRows } = await supabase
          .from('workspaces')
          .select('*')
          .in('id', otherWorkspaceIds);
        otherWorkspaces = nonDmRows || [];
      }

      const dms: Workspace[] = (dmRows || []).map((ws: any) => {
        joinedWorkspaceIds.add(ws.id);
        const mem = memberMap.get(ws.id);
        return {
          ...ws,
          my_role: mem?.role || 'member',
          my_membership_status: mem?.status || 'active',
          is_muted: mem?.is_muted || false,
          unread_count: mem?.unread_count || 0,
        };
      });

      const communities: Workspace[] = [];
      const innerCircles: Workspace[] = [];

      for (const ws of otherWorkspaces) {
        joinedWorkspaceIds.add(ws.id);
        const mem = memberMap.get(ws.id);
        const mapped: Workspace = {
          ...ws,
          my_role: mem?.role,
          my_membership_status: mem?.status,
          is_muted: mem?.is_muted,
          unread_count: mem?.unread_count || 0,
        };
        if (ws.type === 'community') {
          communities.push(mapped);
        } else if (ws.type === 'inner_circle') {
          innerCircles.push(mapped);
        }
      }

      // 4. Resolve DM participant profiles directly
      if (dms.length > 0) {
        const otherUserIds: string[] = [];
        const dmToOtherId = new Map<string, string>();

        for (const dm of dms) {
          let otherId: string | undefined;
          if (dm.dm_participant_a && dm.dm_participant_b) {
            otherId = dm.dm_participant_a === userId ? dm.dm_participant_b : dm.dm_participant_a;
          }
          if (!otherId && dm.canonical_dm_key && dm.canonical_dm_key.includes(':')) {
            const [u1, u2] = dm.canonical_dm_key.split(':');
            otherId = u1 === userId ? u2 : u1;
          }
          if (otherId) {
            otherUserIds.push(otherId);
            dmToOtherId.set(dm.id, otherId);
          }
        }

        // Also query workspace_members for any DM where participant a/b wasn't set
        const missingDmIds = dms.filter((d) => !dmToOtherId.has(d.id)).map((d) => d.id);
        if (missingDmIds.length > 0) {
          const { data: missingMemRows } = await supabase
            .from('workspace_members')
            .select('workspace_id, user_id')
            .in('workspace_id', missingDmIds)
            .neq('user_id', userId);

          if (missingMemRows) {
            for (const row of missingMemRows) {
              dmToOtherId.set(row.workspace_id, row.user_id);
              otherUserIds.push(row.user_id);
            }
          }
        }

        const uniqueOtherIds = Array.from(new Set(otherUserIds));
        if (uniqueOtherIds.length > 0) {
          const profiles = await Promise.all(
            uniqueOtherIds.map(async (uId) => {
              try {
                const p = await fetchUserProfile(uId);
                return { uId, p };
              } catch {
                return { uId, p: null };
              }
            })
          );

          const profMap = new Map<string, any>();
          profiles.forEach(({ uId, p }) => {
            if (p) profMap.set(uId, p);
          });

          for (const dm of dms) {
            const otherId = dmToOtherId.get(dm.id);
            if (otherId && profMap.has(otherId)) {
              const p = profMap.get(otherId);
              dm.other_user = {
                id: p.id,
                fullName: p.fullName || p.handle || 'Researcher',
                handle: p.handle,
                avatarUrl: p.avatarUrl || null,
                academicTitle: p.academicTitle,
                institution: p.institution,
                orcidVerified: p.orcidVerified,
              };
              dm.name = dm.other_user.fullName;
              dm.avatar_url = dm.other_user.avatarUrl || null;
            }
          }
        }
      }

      // 5. Fetch public discoverable communities not yet joined
      const { data: discoverRows } = await supabase
        .from('workspaces')
        .select('*')
        .eq('type', 'community')
        .eq('is_private', false)
        .order('created_at', { ascending: false })
        .limit(20);

      const discoverableCommunities: Workspace[] = (discoverRows || [])
        .filter((ws: any) => !joinedWorkspaceIds.has(ws.id))
        .map((ws: any) => ({
          ...ws,
          my_membership_status: undefined,
          unread_count: 0,
        }));

      return {
        dms,
        communities,
        innerCircles,
        discoverableCommunities,
        error: null,
      };
    } catch (err: any) {
      console.error('[workspaceService] getWorkspaces exception:', err);
      return {
        dms: [],
        communities: [],
        innerCircles: [],
        discoverableCommunities: [],
        error: err.message || 'Failed to fetch workspaces',
      };
    }
  },

  /**
   * Get single workspace details with membership and block status
   */
  async getWorkspaceById(
    workspaceId: string,
    currentUserId?: string
  ): Promise<{ workspace: Workspace | null; error: string | null }> {
    try {
      let effectiveUserId = currentUserId;
      if (!effectiveUserId) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        effectiveUserId = authUser?.id;
      }

      const { data: ws, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (error || !ws) {
        return { workspace: null, error: error?.message || 'Workspace not found' };
      }

      const result: Workspace = { ...ws };

      // Get member count
      const { count: memberCount } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');
      result.members_count = memberCount || 0;

      if (effectiveUserId) {
        // Check current user membership
        const { data: member } = await supabase
          .from('workspace_members')
          .select('role, status, is_muted, unread_count')
          .eq('workspace_id', workspaceId)
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (member) {
          result.my_role = member.role;
          result.my_membership_status = member.status;
          result.is_muted = member.is_muted;
          result.unread_count = member.unread_count;
        }

        // Check if user is blocked in this workspace
        const { data: block } = await supabase
          .from('workspace_blocks')
          .select('reason')
          .eq('workspace_id', workspaceId)
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (block) {
          result.is_blocked = true;
          result.block_reason = block.reason;
        }

        // For DM, fetch other participant's profile directly
        if (ws.type === 'dm') {
          let otherUserId = ws.dm_participant_a === effectiveUserId ? ws.dm_participant_b : ws.dm_participant_a;

          if (!otherUserId && ws.canonical_dm_key && ws.canonical_dm_key.includes(':')) {
            const [u1, u2] = ws.canonical_dm_key.split(':');
            otherUserId = u1 === effectiveUserId ? u2 : u1;
          }

          if (!otherUserId) {
            const { data: mem } = await supabase
              .from('workspace_members')
              .select('user_id')
              .eq('workspace_id', workspaceId)
              .neq('user_id', effectiveUserId)
              .maybeSingle();
            if (mem) {
              otherUserId = mem.user_id;
            }
          }

          if (otherUserId) {
            const p = await fetchUserProfile(otherUserId);
            if (p) {
              result.other_user = {
                id: p.id,
                fullName: p.fullName || p.handle || 'Researcher',
                handle: p.handle,
                avatarUrl: p.avatarUrl || null,
                academicTitle: p.academicTitle,
                institution: p.institution,
                orcidVerified: p.orcidVerified,
              };
              result.name = result.other_user.fullName;
              result.avatar_url = result.other_user.avatarUrl || null;
            }
          }
        }
      }

      return { workspace: result, error: null };
    } catch (err: any) {
      return { workspace: null, error: err.message || 'Failed to fetch workspace' };
    }
  },

  /**
   * Get or Create 1-to-1 DM workspace with mutual follow enforcement
   */
  async getOrCreateDMWorkspace(targetUserId: string): Promise<{
    workspaceId: string | null;
    error: string | null;
    requiresMutualFollow?: boolean;
  }> {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return { workspaceId: null, error: 'User not authenticated' };

      // 1. Try atomic database RPC with p_target_user_id
      let { data, error } = await supabase.rpc('get_or_create_dm_workspace', {
        p_target_user_id: targetUserId,
      });

      if (error && error.message.includes('schema cache')) {
        const retry = await supabase.rpc('get_or_create_dm_workspace', {
          target_user_id: targetUserId,
        });
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        const errLower = (error.message || '').toLowerCase();
        if (
          errLower.includes('mutual_follow_required') ||
          errLower.includes('mutual follow')
        ) {
          return {
            workspaceId: null,
            error:
              'Direct messaging requires a mutual follow between researchers. Both researchers must follow each other to start a conversation.',
            requiresMutualFollow: true,
          };
        }

        // 2. Resilient Fallback: If RPC not in cache yet, enforce mutual follow and get/create workspace
        if (errLower.includes('schema cache') || errLower.includes('not find the function')) {
          // Check mutual follow directly
          const [f1, f2] = await Promise.all([
            supabase
              .from('follows')
              .select('id')
              .eq('follower_id', currentUser.id)
              .eq('following_id', targetUserId)
              .maybeSingle(),
            supabase
              .from('follows')
              .select('id')
              .eq('follower_id', targetUserId)
              .eq('following_id', currentUser.id)
              .maybeSingle(),
          ]);

          const isMutual = Boolean(f1.data && f2.data);
          if (!isMutual) {
            return {
              workspaceId: null,
              error:
                'Direct messaging requires a mutual follow between researchers. Both researchers must follow each other to start a conversation.',
              requiresMutualFollow: true,
            };
          }

          const canonicalKey = [currentUser.id, targetUserId].sort().join(':');

          // Find existing workspace
          const { data: existing } = await supabase
            .from('workspaces')
            .select('id')
            .eq('canonical_dm_key', canonicalKey)
            .maybeSingle();

          if (existing?.id) {
            // Ensure members are active
            await supabase.from('workspace_members').upsert([
              { workspace_id: existing.id, user_id: currentUser.id, role: 'member', status: 'active' },
              { workspace_id: existing.id, user_id: targetUserId, role: 'member', status: 'active' },
            ]);
            return { workspaceId: existing.id, error: null };
          }

          const userA = currentUser.id < targetUserId ? currentUser.id : targetUserId;
          const userB = currentUser.id > targetUserId ? currentUser.id : targetUserId;

          // Insert new workspace
          const { data: newWs, error: insertErr } = await supabase
            .from('workspaces')
            .insert({
              type: 'dm',
              owner_id: currentUser.id,
              creator_id: currentUser.id,
              dm_participant_a: userA,
              dm_participant_b: userB,
              canonical_dm_key: canonicalKey,
              name: 'Direct Message',
              is_private: true,
              subscription_tier: 'free',
              subscription_price_inr: 0,
            })
            .select('id')
            .single();

          if (insertErr || !newWs) {
            return { workspaceId: null, error: insertErr?.message || 'Failed to create DM workspace' };
          }

          await supabase.from('workspace_members').upsert([
            { workspace_id: newWs.id, user_id: currentUser.id, role: 'member', status: 'active' },
            { workspace_id: newWs.id, user_id: targetUserId, role: 'member', status: 'active' },
          ]);

          return { workspaceId: newWs.id, error: null };
        }

        return { workspaceId: null, error: error.message };
      }

      const wsId = typeof data === 'object' && data !== null ? data.id : (data as string);
      return { workspaceId: wsId, error: null };
    } catch (err: any) {
      return { workspaceId: null, error: err.message || 'Failed to start DM' };
    }
  },

  /**
   * Create a research Community Workspace with subscription tier
   */
  async createCommunityWorkspace(params: {
    name: string;
    description?: string;
    subscription_tier: WorkspaceSubscriptionTier;
    is_private?: boolean;
    avatar_url?: string;
    banner_url?: string;
    member_ids?: string[];
  }): Promise<{ workspace: Workspace | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { workspace: null, error: 'User not authenticated' };

      const price = TIER_PRICES[params.subscription_tier] || 0;
      const dbTierEnum = params.subscription_tier === 'free' ? null : params.subscription_tier;

      // 1. Insert workspace
      let wsPayload: any = {
        type: 'community',
        name: params.name.trim(),
        description: params.description?.trim() || null,
        avatar_url: params.avatar_url || null,
        banner_url: params.banner_url || null,
        creator_id: user.id,
        owner_id: user.id,
        is_private: params.is_private ?? false,
        subscription_tier: dbTierEnum,
        subscription_price_inr: price,
        pricing_tier: dbTierEnum,
        price_inr: price,
      };

      let { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert(wsPayload)
        .select()
        .single();

      // Fallback if is_private / owner_id column isn't in older schema
      if (wsErr && (wsErr.message.includes('column') || wsErr.message.includes('schema cache'))) {
        const fallbackPayload = {
          type: 'community',
          name: params.name.trim(),
          description: params.description?.trim() || null,
          avatar_url: params.avatar_url || null,
          creator_id: user.id,
          pricing_tier: dbTierEnum,
          price_inr: price,
        };
        const retry = await supabase.from('workspaces').insert(fallbackPayload).select().single();
        ws = retry.data;
        wsErr = retry.error;
      }

      if (wsErr || !ws) {
        return { workspace: null, error: wsErr?.message || 'Failed to create community' };
      }

      // 2. Insert creator as owner
      const membersToInsert: Array<{ workspace_id: string; user_id: string; role: string; status: string }> = [
        {
          workspace_id: ws.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        },
      ];

      // 3. Insert any initial invited members
      if (Array.isArray(params.member_ids) && params.member_ids.length > 0) {
        for (const mid of params.member_ids) {
          if (mid && mid !== user.id) {
            membersToInsert.push({
              workspace_id: ws.id,
              user_id: mid,
              role: 'member',
              status: 'active',
            });
          }
        }
      }

      const { error: memErr } = await supabase.from('workspace_members').upsert(
        membersToInsert,
        { onConflict: 'workspace_id,user_id' }
      );

      if (memErr) {
        console.warn('Workspace members upsert error (non-fatal):', memErr);
      }

      return { workspace: ws, error: null };
    } catch (err: any) {
      return { workspace: null, error: err.message || 'Failed to create community' };
    }
  },

  /**
   * Create an Inner Circle research pod capped at 25 members
   */
  async createInnerCircleWorkspace(params: {
    name: string;
    description?: string;
    e2ee_enabled?: boolean;
    avatar_url?: string;
    member_ids?: string[];
  }): Promise<{ workspace: Workspace | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { workspace: null, error: 'User not authenticated' };

      // 1. Insert Inner Circle workspace (max_members = 25, is_private = true)
      let wsPayload: any = {
        type: 'inner_circle',
        name: params.name.trim(),
        description: params.description?.trim() || null,
        avatar_url: params.avatar_url || null,
        creator_id: user.id,
        owner_id: user.id,
        is_private: true,
        max_members: 25,
        e2ee_enabled: params.e2ee_enabled ?? true,
        subscription_tier: null,
        subscription_price_inr: 0,
        pricing_tier: null,
        price_inr: 0,
      };

      let { data: ws, error: wsErr } = await supabase
        .from('workspaces')
        .insert(wsPayload)
        .select()
        .single();

      // Fallback if is_private / owner_id column isn't in older schema
      if (wsErr && (wsErr.message.includes('column') || wsErr.message.includes('schema cache'))) {
        const fallbackPayload = {
          type: 'inner_circle',
          name: params.name.trim(),
          description: params.description?.trim() || null,
          avatar_url: params.avatar_url || null,
          creator_id: user.id,
          max_members: 25,
          e2ee_enabled: params.e2ee_enabled ?? true,
          price_inr: 0,
        };
        const retry = await supabase.from('workspaces').insert(fallbackPayload).select().single();
        ws = retry.data;
        wsErr = retry.error;
      }

      if (wsErr || !ws) {
        return { workspace: null, error: wsErr?.message || 'Failed to create inner circle' };
      }

      // 2. Insert creator as owner
      const membersToInsert: Array<{ workspace_id: string; user_id: string; role: string; status: string }> = [
        {
          workspace_id: ws.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
        },
      ];

      // 3. Insert all initial invited members
      if (Array.isArray(params.member_ids) && params.member_ids.length > 0) {
        for (const mid of params.member_ids) {
          if (mid && mid !== user.id) {
            membersToInsert.push({
              workspace_id: ws.id,
              user_id: mid,
              role: 'member',
              status: 'active',
            });
          }
        }
      }

      const { error: memErr } = await supabase.from('workspace_members').upsert(
        membersToInsert,
        { onConflict: 'workspace_id,user_id' }
      );

      if (memErr) {
        console.warn('Workspace members upsert error (non-fatal):', memErr);
      }

      return { workspace: ws, error: null };
    } catch (err: any) {
      return { workspace: null, error: err.message || 'Failed to create inner circle' };
    }
  },

  /**
   * Join a public or free research community
   */
  async joinCommunity(workspaceId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: user.id,
          role: 'member',
          status: 'active',
        },
        { onConflict: 'workspace_id,user_id' }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to join community' };
    }
  },

  /**
   * Fetch messages for a workspace with sender profiles
   */
  async getMessages(
    workspaceId: string,
    limit: number = 50,
    beforeCursor?: string
  ): Promise<{ messages: WorkspaceMessage[]; error: string | null }> {
    try {
      let query = supabase
        .from('workspace_messages')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeCursor) {
        query = query.lt('created_at', beforeCursor);
      }

      const { data, error } = await query;

      if (error) {
        return { messages: [], error: error.message };
      }

      const rawList = data || [];
      const senderIds = Array.from(new Set(rawList.map((m: any) => m.sender_id).filter(Boolean)));
      const senderMap = new Map<string, any>();

      if (senderIds.length > 0) {
        const profs = await Promise.all(
          senderIds.map(async (sId: any) => {
            try {
              const p = await fetchUserProfile(sId);
              return { sId, p };
            } catch {
              return { sId, p: null };
            }
          })
        );

        profs.forEach(({ sId, p }) => {
          if (p) {
            senderMap.set(sId, {
              id: p.id,
              fullName: p.fullName || p.handle || 'Researcher',
              handle: p.handle,
              avatarUrl: p.avatarUrl || null,
              academicTitle: p.academicTitle,
              institution: p.institution,
              orcidVerified: p.orcidVerified,
            });
          }
        });
      }

      const rawMap = new Map<string, any>();
      rawList.forEach((m: any) => rawMap.set(m.id, m));

      const messages: WorkspaceMessage[] = rawList.map((m: any) => {
        let extractedMedia: string[] | null = null;
        if (Array.isArray(m.media_urls) && m.media_urls.length > 0) {
          extractedMedia = m.media_urls;
        } else if (Array.isArray(m.attachments) && m.attachments.length > 0) {
          extractedMedia = m.attachments
            .map((a: any) => (typeof a === 'string' ? a : a?.url || a?.uri))
            .filter(Boolean);
        } else if (m.attachments && typeof m.attachments === 'object') {
          if (Array.isArray(m.attachments.media_urls)) {
            extractedMedia = m.attachments.media_urls;
          } else if (m.attachments.url) {
            extractedMedia = [m.attachments.url];
          }
        }

        // If no media_urls yet, check if content has a direct image link or Supabase storage link
        if ((!extractedMedia || extractedMedia.length === 0) && typeof m.content === 'string') {
          const match = m.content.match(/https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif|\/profile-media\/[^\s]+|\/storage\/v1\/object\/public\/[^\s]+)/i);
          if (match) {
            extractedMedia = [match[0]];
          }
        }

        const isImgType = (extractedMedia && extractedMedia.length > 0) || m.message_type === 'image';

        // Resolve parent reply message info
        let replyInfo = null;
        if (m.reply_to_id && rawMap.has(m.reply_to_id)) {
          const parent = rawMap.get(m.reply_to_id);
          const parentSender = senderMap.get(parent.sender_id);
          replyInfo = {
            id: parent.id,
            sender_name: parentSender?.fullName || parentSender?.handle || 'Researcher',
            content: parent.content || (parent.doi_metadata ? 'Shared a research paper' : 'Attachment'),
            message_type: parent.message_type,
          };
        }

        return {
          id: m.id,
          workspace_id: m.workspace_id,
          sender_id: m.sender_id,
          content: m.content,
          message_type: isImgType ? 'image' : (m.message_type || (m.doi_reference || m.doi_metadata ? 'paper_doi' : 'text')),
          doi_metadata: m.doi_metadata || (m.attachments?.doi_metadata ?? null),
          reactions: m.reactions || null,
          is_edited: m.is_edited || false,
          is_deleted: m.is_deleted || false,
          e2ee_ciphertext: m.e2ee_ciphertext || null,
          e2ee_nonce: m.e2ee_nonce || null,
          media_urls: extractedMedia && extractedMedia.length > 0 ? extractedMedia : null,
          is_pinned: m.is_pinned || false,
          reply_to_id: m.reply_to_id || null,
          reply_to_message: replyInfo,
          created_at: m.created_at,
          updated_at: m.updated_at || m.created_at,
          sender: senderMap.get(m.sender_id),
        };
      });

      // Reverse so oldest in the page is first
      return { messages: messages.reverse(), error: null };
    } catch (err: any) {
      return { messages: [], error: err.message || 'Failed to load messages' };
    }
  },

  /**
   * Send a message to a workspace (with optional DOI auto-enrichment)
   */
  async sendMessage(params: {
    workspace_id: string;
    content: string;
    message_type?: WorkspaceMessageType;
    doi_metadata?: DoiMetadata | null;
    audio_metadata?: WorkspaceAudioMetadata | null;
    post_metadata?: WorkspacePostMetadata | null;
    profile_metadata?: WorkspaceProfileMetadata | null;
    workspace_invite_metadata?: WorkspaceInviteMetadata | null;
    document_metadata?: WorkspaceDocumentMetadata | null;
    call_metadata?: WorkspaceCallMetadata | null;
    reply_to_id?: string | null;
    media_urls?: string[] | null;
    e2ee_ciphertext?: string | null;
    e2ee_nonce?: string | null;
  }): Promise<{ message: WorkspaceMessage | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { message: null, error: 'User not authenticated' };

      let resolvedDoiMeta = params.doi_metadata || null;
      let detectedType: WorkspaceMessageType = params.message_type || (params.media_urls && params.media_urls.length > 0 ? 'image' : 'text');

      // Auto-detect DOI if text looks like a DOI or Paper link and metadata isn't provided
      if (!resolvedDoiMeta && !params.e2ee_ciphertext) {
        const doiMatch = params.content.match(/\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/i);
        if (doiMatch) {
          const rawDoi = doiMatch[1];
          try {
            const resolvedPaper = await resolvePaper(rawDoi);
            if (resolvedPaper) {
              detectedType = 'paper_doi';
              resolvedDoiMeta = {
                doi: resolvedPaper.doi || rawDoi,
                title: resolvedPaper.title,
                authors: (resolvedPaper.authors || []).map((a) => ({ name: a.name, orcid: a.orcid })),
                publicationYear: resolvedPaper.publicationYear,
                journal: resolvedPaper.journal,
                url: resolvedPaper.openAccessUrl || resolvedPaper.canonicalUrl,
                citationCount: resolvedPaper.citationCount,
              };
            }
          } catch {}
        }
      }

      // Prepare attachments payload for multi-schema compatibility
      let attachmentsPayload: any = [];
      if (params.media_urls && params.media_urls.length > 0) {
        attachmentsPayload = params.media_urls.map((u) => ({ type: 'image', url: u }));
      } else if (resolvedDoiMeta) {
        attachmentsPayload = { doi_metadata: resolvedDoiMeta };
      }

      // Try rich insert
      let insertPayload: any = {
        workspace_id: params.workspace_id,
        sender_id: user.id,
        content: params.content,
        message_type: detectedType,
        doi_metadata: resolvedDoiMeta,
        e2ee_ciphertext: params.e2ee_ciphertext || null,
        e2ee_nonce: params.e2ee_nonce || null,
        media_urls: params.media_urls || null,
        attachments: attachmentsPayload,
        reply_to_id: params.reply_to_id || null,
      };

      let { data, error } = await supabase
        .from('workspace_messages')
        .insert(insertPayload)
        .select()
        .single();

      // Fallback to basic columns if schema cache has not yet refreshed
      if (error && (error.message.includes('column') || error.message.includes('schema cache'))) {
        const fallbackRes = await supabase
          .from('workspace_messages')
          .insert({
            workspace_id: params.workspace_id,
            sender_id: user.id,
            content: params.content,
            attachments: attachmentsPayload,
          })
          .select()
          .single();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error || !data) {
        return { message: null, error: error?.message || 'Failed to send message' };
      }

      // Fetch sender profile info
      let senderInfo: any = null;
      try {
        const senderProf = await fetchUserProfile(user.id);
        if (senderProf) {
          senderInfo = {
            id: senderProf.id,
            fullName: senderProf.fullName || senderProf.handle || 'Researcher',
            handle: senderProf.handle,
            avatarUrl: senderProf.avatarUrl || null,
            academicTitle: senderProf.academicTitle,
            institution: senderProf.institution,
            orcidVerified: senderProf.orcidVerified,
          };
        }
      } catch {}

      const msg: WorkspaceMessage = {
        id: data.id,
        workspace_id: data.workspace_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type || detectedType,
        doi_metadata: data.doi_metadata || resolvedDoiMeta,
        e2ee_ciphertext: data.e2ee_ciphertext || null,
        e2ee_nonce: data.e2ee_nonce || null,
        media_urls: data.media_urls || null,
        is_pinned: data.is_pinned || false,
        reply_to_id: data.reply_to_id || null,
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
        sender: senderInfo,
      };

      return { message: msg, error: null };
    } catch (err: any) {
      return { message: null, error: err.message || 'Failed to send message' };
    }
  },

  /**
   * Mark workspace messages as read
   */
  async markWorkspaceAsRead(workspaceId: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('workspace_members')
        .update({
          last_read_at: new Date().toISOString(),
          unread_count: 0,
        })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
    } catch {
      // Non-fatal
    }
  },

  /**
   * Toggle emoji reaction on a message
   */
  async toggleReaction(
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<{ reactions: Record<string, string[]>; error: string | null }> {
    try {
      const { data: msg, error: fetchErr } = await supabase
        .from('workspace_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchErr && !fetchErr.message.includes('column')) {
        return { reactions: {}, error: fetchErr.message };
      }

      let currentReactions: Record<string, string[]> = (msg?.reactions as any) || {};
      if (typeof currentReactions !== 'object' || currentReactions === null || Array.isArray(currentReactions)) {
        currentReactions = {};
      }

      const usersForEmoji = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];
      const userIndex = usersForEmoji.indexOf(userId);

      if (userIndex > -1) {
        usersForEmoji.splice(userIndex, 1);
      } else {
        usersForEmoji.push(userId);
      }

      const updated = { ...currentReactions };
      if (usersForEmoji.length > 0) {
        updated[emoji] = usersForEmoji;
      } else {
        delete updated[emoji];
      }

      const { error: updateErr } = await supabase
        .from('workspace_messages')
        .update({ reactions: updated })
        .eq('id', messageId);

      if (updateErr) {
        return { reactions: updated, error: updateErr.message };
      }

      return { reactions: updated, error: null };
    } catch (err: any) {
      return { reactions: {}, error: err.message || 'Failed to toggle reaction' };
    }
  },

  /**
   * Edit a sent message
   */
  async editMessage(
    messageId: string,
    newContent: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('workspace_messages')
        .update({
          content: newContent.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to edit message' };
    }
  },

  /**
   * Delete a message (soft delete for everyone, or remove)
   */
  async deleteMessage(
    messageId: string,
    deleteForEveryone: boolean = true
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (deleteForEveryone) {
        const { error } = await supabase
          .from('workspace_messages')
          .update({
            content: '🚫 This message was deleted',
            is_deleted: true,
            media_urls: null,
            attachments: [],
            doi_metadata: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', messageId);

        if (error) return { success: false, error: error.message };
      } else {
        // Delete row
        const { error } = await supabase
          .from('workspace_messages')
          .delete()
          .eq('id', messageId);

        if (error) return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete message' };
    }
  },

  /**
   * Forward a message to another workspace/DM
   */
  async forwardMessage(
    targetWorkspaceId: string,
    message: WorkspaceMessage
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const res = await this.sendMessage({
        workspace_id: targetWorkspaceId,
        content: message.content,
        message_type: message.message_type,
        doi_metadata: message.doi_metadata,
        media_urls: message.media_urls,
      });
      return { success: Boolean(res.message), error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to forward message' };
    }
  },

  /**
   * Transparent Moderation: Block member with mandatory reason
   */
  async blockWorkspaceMember(params: {
    workspaceId: string;
    targetUserId: string;
    reason: string;
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const trimmedReason = params.reason.trim();
      if (trimmedReason.length < 5) {
        return { success: false, error: 'A clear reason (at least 5 characters) is mandatory for transparent moderation.' };
      }

      // 1. Insert block record
      const { error: blockErr } = await supabase.from('workspace_blocks').insert({
        workspace_id: params.workspaceId,
        user_id: params.targetUserId,
        blocked_by: user.id,
        reason: trimmedReason,
      });

      if (blockErr) {
        return { success: false, error: blockErr.message };
      }

      // 2. Remove from active members
      await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.targetUserId);

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to block member' };
    }
  },

  /**
   * Fetch transparent moderation block logs for a workspace
   */
  async getWorkspaceBlocks(workspaceId: string): Promise<{ blocks: WorkspaceBlock[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workspace_blocks')
        .select(`
          id,
          workspace_id,
          user_id,
          blocked_by,
          reason,
          created_at,
          blocked_user:profiles!workspace_blocks_user_id_fkey (
            id, full_name, handle, avatar_url
          ),
          moderator:profiles!workspace_blocks_blocked_by_fkey (
            id, full_name, handle
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { blocks: [], error: error.message };
      }

      const blocks: WorkspaceBlock[] = (data || []).map((b: any) => ({
        id: b.id,
        workspace_id: b.workspace_id,
        user_id: b.user_id,
        blocked_by: b.blocked_by,
        reason: b.reason,
        created_at: b.created_at,
        blocked_user: b.blocked_user
          ? {
              id: b.blocked_user.id,
              fullName: b.blocked_user.full_name || b.blocked_user.handle,
              handle: b.blocked_user.handle,
              avatarUrl: b.blocked_user.avatar_url,
            }
          : undefined,
        moderator: b.moderator
          ? {
              id: b.moderator.id,
              fullName: b.moderator.full_name || b.moderator.handle,
              handle: b.moderator.handle,
            }
          : undefined,
      }));

      return { blocks, error: null };
    } catch (err: any) {
      return { blocks: [], error: err.message || 'Failed to fetch block logs' };
    }
  },

  /**
   * Events & Calendar (Inner Circle & Community)
   */
  async getWorkspaceEvents(workspaceId: string): Promise<{ events: WorkspaceEvent[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workspace_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('start_time', { ascending: true });

      if (error) {
        return { events: [], error: error.message };
      }

      const rawEvents = data || [];
      const creatorIds = Array.from(new Set(rawEvents.map((e: any) => e.creator_id).filter(Boolean)));
      const creatorMap = new Map<string, any>();

      if (creatorIds.length > 0) {
        const profs = await Promise.all(
          creatorIds.map(async (cId: any) => {
            try {
              const p = await fetchUserProfile(cId);
              return { cId, p };
            } catch {
              return { cId, p: null };
            }
          })
        );

        profs.forEach(({ cId, p }) => {
          if (p) {
            creatorMap.set(cId, {
              id: p.id,
              fullName: p.fullName || p.handle || 'Researcher',
              handle: p.handle,
              avatarUrl: p.avatarUrl || null,
              academicTitle: p.academicTitle,
              institution: p.institution,
              orcidVerified: p.orcidVerified,
            });
          }
        });
      }

      const events: WorkspaceEvent[] = rawEvents.map((e: any) => ({
        id: e.id,
        workspace_id: e.workspace_id,
        creator_id: e.creator_id,
        title: e.title,
        description: e.description,
        event_type: e.event_type || 'lab_meeting',
        start_time: e.start_time || e.event_date || e.created_at,
        end_time: e.end_time,
        meeting_link: e.meeting_link || e.location_or_url,
        created_at: e.created_at,
        creator: creatorMap.get(e.creator_id),
      }));

      return { events, error: null };
    } catch (err: any) {
      return { events: [], error: err.message || 'Failed to load events' };
    }
  },

  async createWorkspaceEvent(params: {
    workspaceId: string;
    title: string;
    description?: string;
    eventType: 'live_session' | 'reading_group' | 'lab_meeting' | 'milestone';
    startTime: string;
    endTime?: string;
    meetingLink?: string;
  }): Promise<{ event: WorkspaceEvent | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { event: null, error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('workspace_events')
        .insert({
          workspace_id: params.workspaceId,
          creator_id: user.id,
          title: params.title.trim(),
          description: params.description?.trim() || null,
          event_type: params.eventType,
          start_time: params.startTime,
          end_time: params.endTime || null,
          meeting_link: params.meetingLink?.trim() || null,
        })
        .select()
        .single();

      if (error || !data) {
        return { event: null, error: error?.message || 'Failed to create event' };
      }

      return { event: data, error: null };
    } catch (err: any) {
      return { event: null, error: err.message || 'Failed to create event' };
    }
  },

  /**
   * Roles & Opportunities (Inner Circle)
   */
  async getWorkspaceRolesOpportunities(
    workspaceId: string
  ): Promise<{ opportunities: WorkspaceRoleOpportunity[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workspace_roles_opportunities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        return { opportunities: [], error: error.message };
      }

      const rawOpps = data || [];
      const creatorIds = Array.from(new Set(rawOpps.map((o: any) => o.creator_id).filter(Boolean)));
      const creatorMap = new Map<string, any>();

      if (creatorIds.length > 0) {
        const profs = await Promise.all(
          creatorIds.map(async (cId: any) => {
            try {
              const p = await fetchUserProfile(cId);
              return { cId, p };
            } catch {
              return { cId, p: null };
            }
          })
        );

        profs.forEach(({ cId, p }) => {
          if (p) {
            creatorMap.set(cId, {
              id: p.id,
              fullName: p.fullName || p.handle || 'Researcher',
              handle: p.handle,
              avatarUrl: p.avatarUrl || null,
              academicTitle: p.academicTitle,
              institution: p.institution,
              orcidVerified: p.orcidVerified,
            });
          }
        });
      }

      const opportunities: WorkspaceRoleOpportunity[] = rawOpps.map((o: any) => ({
        id: o.id,
        workspace_id: o.workspace_id,
        creator_id: o.creator_id,
        title: o.title,
        role_type: o.role_type || 'co_author',
        description: o.description,
        compensation: o.compensation,
        is_open: o.is_open ?? true,
        created_at: o.created_at,
        creator: creatorMap.get(o.creator_id),
      }));

      return { opportunities, error: null };
    } catch (err: any) {
      return { opportunities: [], error: err.message || 'Failed to load opportunities' };
    }
  },

  async createWorkspaceRoleOpportunity(params: {
    workspaceId: string;
    title: string;
    roleType: 'co_author' | 'research_assistant' | 'reviewer' | 'grant_partner' | 'postdoc';
    description: string;
    compensation?: string;
  }): Promise<{ opportunity: WorkspaceRoleOpportunity | null; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { opportunity: null, error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('workspace_roles_opportunities')
        .insert({
          workspace_id: params.workspaceId,
          creator_id: user.id,
          title: params.title.trim(),
          role_type: params.roleType,
          description: params.description.trim(),
          compensation: params.compensation?.trim() || null,
          is_open: true,
        })
        .select()
        .single();

      if (error || !data) {
        return { opportunity: null, error: error?.message || 'Failed to create opportunity' };
      }

      return { opportunity: data, error: null };
    } catch (err: any) {
      return { opportunity: null, error: err.message || 'Failed to create opportunity' };
    }
  },

  /**
   * Inner Circle Member Management (Max 25 Capped)
   */
  async inviteToInnerCircle(
    workspaceId: string,
    targetUserId: string,
    role: 'member' | 'moderator' | 'admin' = 'member'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      // 1. Try atomic RPC
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('invite_inner_circle_member', {
        p_workspace_id: workspaceId,
        p_target_user_id: targetUserId,
        p_role: role,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        if ((rpcRes as any).success) {
          return { success: true, error: null };
        } else {
          return { success: false, error: (rpcRes as any).error || 'Failed to invite researcher' };
        }
      }

      // 2. Direct Fallback: Check member count & upsert
      const { count: currentMembers } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');

      if (currentMembers !== null && currentMembers >= 25) {
        return {
          success: false,
          error: 'Inner Circle pod capacity reached (maximum 25 members).',
        };
      }

      const { error: insertErr } = await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: targetUserId,
          role,
          status: 'active',
        },
        { onConflict: 'workspace_id,user_id' }
      );

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to invite researcher' };
    }
  },

  /**
   * Fetch all members in a workspace with resolved researcher profiles
   */
  async getWorkspaceMembers(workspaceId: string): Promise<{ members: WorkspaceMember[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });

      if (error) {
        return { members: [], error: error.message };
      }

      const rawMembers = data || [];
      const userIds = Array.from(new Set(rawMembers.map((m: any) => m.user_id).filter(Boolean)));
      const profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        const profs = await Promise.all(
          userIds.map(async (uId: any) => {
            try {
              const p = await fetchUserProfile(uId);
              return { uId, p };
            } catch {
              return { uId, p: null };
            }
          })
        );

        profs.forEach(({ uId, p }) => {
          if (p) {
            profileMap.set(uId, {
              id: p.id,
              fullName: p.fullName || p.handle || 'Researcher',
              handle: p.handle,
              avatarUrl: p.avatarUrl || null,
              academicTitle: p.academicTitle,
              institution: p.institution,
              orcidVerified: p.orcidVerified,
            });
          }
        });
      }

      const members: WorkspaceMember[] = rawMembers.map((m: any) => ({
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role || 'member',
        status: m.status || 'active',
        is_muted: Boolean(m.is_muted),
        last_read_at: m.last_read_at || m.joined_at,
        unread_count: m.unread_count || 0,
        joined_at: m.joined_at,
        profile: profileMap.get(m.user_id),
      }));

      return { members, error: null };
    } catch (err: any) {
      return { members: [], error: err.message || 'Failed to load workspace members' };
    }
  },

  /**
   * Remove member or Leave Workspace
   */
  async removeWorkspaceMember(
    workspaceId: string,
    targetUserId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to remove member' };
    }
  },

  async leaveWorkspace(workspaceId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      return await this.removeWorkspaceMember(workspaceId, user.id);
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to leave workspace' };
    }
  },

  /**
   * Update workspace details (e.g. name, description, avatar_url)
   */
  async updateWorkspaceDetails(
    workspaceId: string,
    updates: { name?: string; description?: string; avatar_url?: string }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update workspace' };
    }
  },

  /**
   * Saved Items (Inner Circle)
   */
  async getWorkspaceSavedItems(
    workspaceId: string,
    userId: string
  ): Promise<{ savedItems: WorkspaceSavedItem[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('workspace_saved_items')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { savedItems: [], error: error.message };
      }

      return { savedItems: data || [], error: null };
    } catch (err: any) {
      return { savedItems: [], error: err.message || 'Failed to load saved items' };
    }
  },

  async saveWorkspaceItem(params: {
    workspaceId: string;
    itemType: 'message' | 'doi_paper' | 'opportunity' | 'event';
    itemId: string;
    note?: string;
  }): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase.from('workspace_saved_items').upsert(
        {
          workspace_id: params.workspaceId,
          user_id: user.id,
          item_type: params.itemType,
          item_id: params.itemId,
          note: params.note?.trim() || null,
        },
        { onConflict: 'workspace_id,user_id,item_id' }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save item' };
    }
  },

  async removeSavedWorkspaceItem(
    workspaceId: string,
    itemId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('workspace_saved_items')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('item_id', itemId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to remove saved item' };
    }
  },

  /**
   * Get total unread count across all user's workspaces
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('unread_count')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error || !data) return 0;

      return data.reduce((acc: number, curr: any) => acc + (curr.unread_count || 0), 0);
    } catch {
      return 0;
    }
  },
};
