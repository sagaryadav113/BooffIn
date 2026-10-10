import { supabase } from './client';
import { fetchUserProfile } from './authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  WorkspacePollData,
} from '../types/workspace';
import { resolvePaper } from './paperResolver';

export interface UserChatPreferences {
  pinned: string[];
  archived: string[];
  muted: Record<string, { isMuted: boolean; until?: string | null }>;
  deleted: string[];
  clearedAt: Record<string, string>;
}

async function getChatPreferences(userId: string): Promise<UserChatPreferences> {
  try {
    const raw = await AsyncStorage.getItem(`booffin_chat_prefs_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        pinned: Array.isArray(parsed.pinned) ? parsed.pinned : [],
        archived: Array.isArray(parsed.archived) ? parsed.archived : [],
        muted: parsed.muted && typeof parsed.muted === 'object' ? parsed.muted : {},
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
        clearedAt: parsed.clearedAt && typeof parsed.clearedAt === 'object' ? parsed.clearedAt : {},
      };
    }
  } catch (err) {
    console.warn('[workspaceService] Failed to load chat preferences:', err);
  }
  return { pinned: [], archived: [], muted: {}, deleted: [], clearedAt: {} };
}

async function saveChatPreferences(userId: string, prefs: UserChatPreferences): Promise<void> {
  try {
    await AsyncStorage.setItem(`booffin_chat_prefs_${userId}`, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[workspaceService] Failed to save chat preferences:', err);
  }
}

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

      // 5. Fetch user chat preferences (pinned, archived, muted, deleted, cleared history)
      const prefs = await getChatPreferences(userId);

      // 6. Fetch latest messages & read status for all active workspaces
      const allActiveWorkspaces = [...dms, ...communities, ...innerCircles];
      const allWsIds = allActiveWorkspaces.map((w) => w.id);

      const latestMsgMap = new Map<string, any>();
      const wsMsgsMap = new Map<string, any[]>();
      const otherReadMap = new Map<string, string>();

      if (allWsIds.length > 0) {
        try {
          const { data: recentMsgRows, error: msgErr } = await supabase
            .from('workspace_messages')
            .select('*')
            .in('workspace_id', allWsIds)
            .order('created_at', { ascending: false });

          if (!msgErr && Array.isArray(recentMsgRows)) {
            recentMsgRows.forEach((m: any) => {
              if (!latestMsgMap.has(m.workspace_id)) {
                latestMsgMap.set(m.workspace_id, m);
              }
              const list = wsMsgsMap.get(m.workspace_id) || [];
              list.push(m);
              wsMsgsMap.set(m.workspace_id, list);
            });
          } else if (msgErr) {
            console.warn('Error fetching recent workspace messages:', msgErr.message);
          }
        } catch (e) {
          console.warn('Failed to load recent workspace messages:', e);
        }

        // For DMs, also fetch the other member's last_read_at
        const dmIds = dms.map((d) => d.id);
        if (dmIds.length > 0) {
          try {
            const { data: otherMemRows } = await supabase
              .from('workspace_members')
              .select('workspace_id, user_id, last_read_at')
              .in('workspace_id', dmIds)
              .neq('user_id', userId);

            (otherMemRows || []).forEach((r: any) => {
              if (r.last_read_at) {
                otherReadMap.set(r.workspace_id, r.last_read_at);
              }
            });
          } catch (e) {
            console.warn('Failed to load other member read timestamps:', e);
          }
        }
      }

      const enrichWorkspace = (ws: Workspace): Workspace => {
        let lastMsg = latestMsgMap.get(ws.id) || null;
        const mem = memberMap.get(ws.id);
        const myLastReadTime = mem?.last_read_at ? new Date(mem.last_read_at).getTime() : 0;

        // Check if history was cleared locally
        const clearedIso = prefs.clearedAt?.[ws.id];
        if (clearedIso && lastMsg) {
          if (new Date(lastMsg.created_at).getTime() <= new Date(clearedIso).getTime()) {
            lastMsg = null;
          }
        }

        const msgs = wsMsgsMap.get(ws.id) || [];
        const unreadCountFromMsgs = msgs.filter((m) => {
          if (clearedIso && new Date(m.created_at).getTime() <= new Date(clearedIso).getTime()) {
            return false;
          }
          return m.sender_id !== userId && new Date(m.created_at).getTime() > myLastReadTime;
        }).length;

        const effectiveUnread = Math.max(mem?.unread_count || 0, unreadCountFromMsgs);

        let formattedLastMessage: WorkspaceMessage | null = null;
        if (lastMsg) {
          let extractedMedia: string[] | null = null;
          if (Array.isArray(lastMsg.media_urls) && lastMsg.media_urls.length > 0) {
            extractedMedia = lastMsg.media_urls;
          } else if (Array.isArray(lastMsg.attachments) && lastMsg.attachments.length > 0) {
            extractedMedia = lastMsg.attachments
              .map((a: any) => (typeof a === 'string' ? a : a?.url || a?.uri))
              .filter(Boolean);
          } else if (lastMsg.attachments && typeof lastMsg.attachments === 'object') {
            if (Array.isArray(lastMsg.attachments.media_urls)) {
              extractedMedia = lastMsg.attachments.media_urls;
            } else if (lastMsg.attachments.url) {
              extractedMedia = [lastMsg.attachments.url];
            }
          }

          if ((!extractedMedia || extractedMedia.length === 0) && typeof lastMsg.content === 'string') {
            const match = lastMsg.content.match(/https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif|\/profile-media\/[^\s]+|\/storage\/v1\/object\/public\/[^\s]+)/i);
            if (match) {
              extractedMedia = [match[0]];
            }
          }

          const isImg = (extractedMedia && extractedMedia.length > 0) || lastMsg.message_type === 'image';
          const docMeta = lastMsg.document_metadata || lastMsg.attachments?.document_metadata || null;
          const doiMeta = lastMsg.doi_metadata || lastMsg.attachments?.doi_metadata || null;
          const postMeta = lastMsg.post_metadata || lastMsg.attachments?.post_metadata || null;
          const profMeta = lastMsg.profile_metadata || lastMsg.attachments?.profile_metadata || null;
          const callMeta = lastMsg.call_metadata || lastMsg.attachments?.call_metadata || null;
          const audioMeta = lastMsg.audio_metadata || lastMsg.attachments?.audio_metadata || null;
          const inviteMeta = lastMsg.workspace_invite_metadata || lastMsg.attachments?.workspace_invite_metadata || null;

          formattedLastMessage = {
            id: lastMsg.id,
            workspace_id: lastMsg.workspace_id,
            sender_id: lastMsg.sender_id,
            content: lastMsg.content,
            message_type: isImg ? 'image' : (lastMsg.message_type || (doiMeta ? 'paper_doi' : 'text')),
            doi_metadata: doiMeta,
            document_metadata: docMeta,
            post_metadata: postMeta,
            profile_metadata: profMeta,
            call_metadata: callMeta,
            audio_metadata: audioMeta,
            workspace_invite_metadata: inviteMeta,
            is_deleted: lastMsg.is_deleted || false,
            media_urls: extractedMedia,
            created_at: lastMsg.created_at,
            updated_at: lastMsg.updated_at || lastMsg.created_at,
            e2ee_ciphertext: null,
            e2ee_nonce: null,
            is_pinned: false,
            reply_to_id: null,
          };
        }

        return {
          ...ws,
          last_message: formattedLastMessage,
          unread_count: effectiveUnread,
          other_last_read_at: otherReadMap.get(ws.id) || null,
          updated_at: formattedLastMessage?.created_at || ws.updated_at || ws.created_at,
        };
      };

      const enrichedRawDms = dms.map(enrichWorkspace);
      const enrichedCommunities = communities.map(enrichWorkspace);
      const enrichedInnerCircles = innerCircles.map(enrichWorkspace);

      // Filter deleted DMs and enrich with preference flags
      const enrichedDms: Workspace[] = enrichedRawDms
        .filter((dm) => !prefs.deleted.includes(dm.id))
        .map((dm) => ({
          ...dm,
          is_pinned: prefs.pinned.includes(dm.id),
          is_archived: prefs.archived.includes(dm.id),
          is_muted: dm.is_muted || Boolean(prefs.muted[dm.id]?.isMuted),
          muted_until: prefs.muted[dm.id]?.until || null,
        }))
        .sort((a, b) => {
          // Pinned conversations always stay pinned at the top
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          const timeA = new Date(a.updated_at || a.created_at).getTime();
          const timeB = new Date(b.updated_at || b.created_at).getTime();
          return timeB - timeA;
        });

      // 6. Fetch public discoverable communities not yet joined
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
        dms: enrichedDms,
        communities: enrichedCommunities,
        innerCircles: enrichedInnerCircles,
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
          .select('role, status, is_muted, unread_count, joined_at')
          .eq('workspace_id', workspaceId)
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (member) {
          result.my_role = member.role;
          result.my_membership_status = member.status;
          result.is_muted = member.is_muted;
          result.unread_count = member.unread_count;
          result.my_joined_at = member.joined_at;
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

      // Strict Community Limit: Maximum 3 active communities created per user
      const { data: userCommunities, error: countErr } = await supabase
        .from('workspaces')
        .select('id, is_disabled, status, settings')
        .eq('type', 'community')
        .or(`owner_id.eq.${user.id},creator_id.eq.${user.id}`);

      const activeCount = (userCommunities || []).filter(
        (c: any) =>
          c.is_disabled !== true &&
          c.status !== 'disabled' &&
          c.settings?.is_disabled !== true
      ).length;

      if (!countErr && activeCount >= 3) {
        return {
          workspace: null,
          error:
            'Community Limit Reached: You cannot have more than 3 active communities. Please disable one of your existing communities to create a new one.',
        };
      }

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
          joined_at: new Date().toISOString(),
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
   * Permanently disable a community workspace (Permanent read-only archive).
   * Note: Cannot be recovered once disabled. Members can still view chats and materials
   * for show/archive purpose, but cannot send messages or communicate.
   */
  async disableCommunity(workspaceId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      const { data: ws, error: fetchErr } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (fetchErr || !ws) {
        return { success: false, error: 'Community workspace not found' };
      }

      if (ws.owner_id !== user.id && ws.creator_id !== user.id) {
        return { success: false, error: 'Only the community owner can disable this community' };
      }

      const updatedSettings = {
        ...(ws.settings || {}),
        is_disabled: true,
        disabled_at: new Date().toISOString(),
        disabled_by: user.id,
      };

      let { error: updateErr } = await supabase
        .from('workspaces')
        .update({
          is_disabled: true,
          status: 'disabled',
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workspaceId);

      // Fallback if is_disabled / status column is missing
      if (updateErr && (updateErr.message.includes('column') || updateErr.message.includes('schema cache'))) {
        const { error: fallbackErr } = await supabase
          .from('workspaces')
          .update({
            settings: updatedSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workspaceId);
        updateErr = fallbackErr;
      }

      if (updateErr) {
        return { success: false, error: updateErr.message || 'Failed to disable community' };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to disable community' };
    }
  },

  /**
   * Update workspace details (name, description, avatar, settings)
   */
  async updateWorkspaceDetails(
    workspaceId: string,
    updates: {
      name?: string;
      description?: string | null;
      avatar_url?: string | null;
      banner_url?: string | null;
      settings?: Record<string, any>;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.description !== undefined) payload.description = updates.description ? updates.description.trim() : null;
      if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
      if (updates.banner_url !== undefined) payload.banner_url = updates.banner_url;
      if (updates.settings !== undefined) payload.settings = updates.settings;

      const { error } = await supabase
        .from('workspaces')
        .update(payload)
        .eq('id', workspaceId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update workspace details' };
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

      // 1. Fetch and reconcile all poll vote action transactions across the workspace
      let voteActions: any[] = [];
      try {
        const { data: vData } = await supabase
          .from('workspace_messages')
          .select('id, sender_id, content, attachments, created_at')
          .eq('workspace_id', workspaceId)
          .or('content.ilike.%Vote:%,content.ilike.%[POLL_VOTE]%')
          .order('created_at', { ascending: true });
        if (Array.isArray(vData)) {
          voteActions = vData;
        }
      } catch {}

      const allVoteRecords = [
        ...rawList.filter(
          (m: any) =>
            m.attachments?.is_poll_vote_action === true ||
            (typeof m.content === 'string' && (m.content.includes('Vote:') || m.content.includes('[POLL_VOTE]')))
        ),
        ...voteActions,
      ];

      // Map: pollMessageId -> Map<voterUserId, optionId>
      const pollVoteLedger = new Map<string, Map<string, string>>();
      allVoteRecords.forEach((m: any) => {
        let pollId = m.attachments?.poll_id;
        let optionId = m.attachments?.option_id;
        let voterId = m.attachments?.voter_id || m.sender_id;

        // Fallback: Parse pollId and optionId from content string format "🗳️ Vote: opt_X [uuid]"
        if (!pollId && typeof m.content === 'string') {
          const matchPoll = m.content.match(/\[([a-f0-9\-]+)\]/i);
          if (matchPoll) pollId = matchPoll[1];
        }
        if (optionId === undefined && typeof m.content === 'string') {
          const matchOpt = m.content.match(/Vote:\s*([^\s\[]+)/i);
          if (matchOpt && matchOpt[1] !== 'retracted') {
            optionId = matchOpt[1];
          } else {
            optionId = '';
          }
        }

        if (pollId && voterId) {
          if (!pollVoteLedger.has(pollId)) {
            pollVoteLedger.set(pollId, new Map());
          }
          pollVoteLedger.get(pollId)!.set(voterId, optionId || '');
        }
      });

      // 2. Filter out raw vote transaction records from visible chat messages
      const visibleRawList = rawList.filter((m: any) => {
        const isVoteAction =
          m.attachments?.is_poll_vote_action === true ||
          (typeof m.content === 'string' && (m.content.includes('Vote:') || m.content.includes('[POLL_VOTE]')));
        return !isVoteAction;
      });

      const messages: WorkspaceMessage[] = visibleRawList.map((m: any) => {
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

        const docMeta = m.document_metadata || m.attachments?.document_metadata || null;
        const inviteMeta = m.workspace_invite_metadata || m.attachments?.workspace_invite_metadata || null;
        const postMeta = m.post_metadata || m.attachments?.post_metadata || null;
        const profMeta = m.profile_metadata || m.attachments?.profile_metadata || null;
        const callMeta = m.call_metadata || m.attachments?.call_metadata || null;
        const audioMeta = m.audio_metadata || m.attachments?.audio_metadata || null;
        const doiMeta = m.doi_metadata || m.attachments?.doi_metadata || null;
        let pollData: any = m.poll_data || m.attachments?.poll_data || null;

        // Fallback: reconstruct pollData from content if it was wiped or missing from attachments
        if (!pollData && typeof m.content === 'string' && m.content.startsWith('📊 Poll:')) {
          const lines = m.content.split('\n');
          const questionText = lines[0].replace('📊 Poll:', '').trim();
          const optLines = lines.slice(1).filter((l: string) => l.startsWith('• '));
          const parsedOptions = optLines.map((l: string, idx: number) => ({
            id: `opt_${idx}`,
            text: l.replace('• ', '').trim(),
            votes: [] as string[],
          }));
          if (parsedOptions.length > 0) {
            pollData = {
              question: questionText,
              options: parsedOptions,
              totalVotes: 0,
            };
          }
        }

        // Extract reactions from attachments.reactions
        let reactions: Record<string, string[]> = {};
        if (m.reactions && typeof m.reactions === 'object' && !Array.isArray(m.reactions)) {
          reactions = { ...m.reactions };
        } else if (m.attachments?.reactions && typeof m.attachments.reactions === 'object' && !Array.isArray(m.attachments.reactions)) {
          reactions = { ...m.attachments.reactions };
        }

        // Apply ledger votes if this is a poll message
        if (pollVoteLedger.has(m.id)) {
          const ledgerVotes = pollVoteLedger.get(m.id)!;
          // Apply to reactions
          ledgerVotes.forEach((chosenOptId, voterId) => {
            // Remove voter from all options first
            Object.keys(reactions).forEach((k) => {
              if (k.startsWith('vote:') && Array.isArray(reactions[k])) {
                reactions[k] = reactions[k].filter((uid) => uid !== voterId);
                if (reactions[k].length === 0) delete reactions[k];
              }
            });
            // Add to chosen option if not retracted
            if (chosenOptId) {
              const voteKey = `vote:${chosenOptId}`;
              if (!reactions[voteKey]) reactions[voteKey] = [];
              if (!reactions[voteKey].includes(voterId)) reactions[voteKey].push(voterId);
            }
          });

          // Apply to pollData if available
          if (pollData && Array.isArray(pollData.options)) {
            const updatedOpts = pollData.options.map((opt: any) => {
              let votes: string[] = Array.isArray(opt.votes) ? [...opt.votes] : [];
              ledgerVotes.forEach((chosenOptId, voterId) => {
                votes = votes.filter((uid) => uid !== voterId);
                if (opt.id === chosenOptId) {
                  votes.push(voterId);
                }
              });
              return { ...opt, votes };
            });

            let total = 0;
            updatedOpts.forEach((opt: any) => {
              total += (opt.votes?.length || 0);
            });

            pollData = {
              ...pollData,
              options: updatedOpts,
              totalVotes: total,
            };
          }
        }

        const isImgType = Boolean(extractedMedia && extractedMedia.length > 0) || m.message_type === 'image';

        let detectedType = m.message_type;
        if (isImgType) detectedType = 'image';
        else if (docMeta) detectedType = 'document';
        else if (inviteMeta) detectedType = 'workspace_invite';
        else if (postMeta) detectedType = 'post';
        else if (profMeta) detectedType = 'profile';
        else if (callMeta) detectedType = 'call_log';
        else if (audioMeta) detectedType = 'audio';
        else if (doiMeta) detectedType = 'paper_doi';
        else if (pollData || (typeof m.content === 'string' && m.content.startsWith('📊 Poll:'))) detectedType = 'poll';
        else if (!detectedType) detectedType = 'text';

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
          message_type: detectedType,
          doi_metadata: doiMeta,
          document_metadata: docMeta,
          workspace_invite_metadata: inviteMeta,
          post_metadata: postMeta,
          profile_metadata: profMeta,
          call_metadata: callMeta,
          audio_metadata: audioMeta,
          poll_data: pollData,
          attachments: m.attachments || null,
          reactions: Object.keys(reactions).length > 0 ? reactions : null,
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
      let orderedMessages = messages.reverse();

      // Check if user cleared history for this workspace
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.id) {
        const prefs = await getChatPreferences(authUser.id);
        const clearedIso = prefs.clearedAt[workspaceId];
        if (clearedIso) {
          const clearedTime = new Date(clearedIso).getTime();
          orderedMessages = orderedMessages.filter(
            (m) => new Date(m.created_at).getTime() > clearedTime
          );
        }
      }

      return { messages: orderedMessages, error: null };
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
    poll_data?: WorkspacePollData | null;
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

      // Block sending messages to a disabled/archived workspace
      const { data: targetWs } = await supabase
        .from('workspaces')
        .select('id, is_disabled, status, settings')
        .eq('id', params.workspace_id)
        .single();

      if (
        targetWs &&
        (targetWs.is_disabled === true ||
          targetWs.status === 'disabled' ||
          targetWs.settings?.is_disabled === true)
      ) {
        return {
          message: null,
          error:
            'This community has been permanently disabled and is preserved in read-only mode. New messages cannot be sent.',
        };
      }

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

      // Prepare rich attachments payload
      const attachmentsPayload: any = {};
      if (params.media_urls && params.media_urls.length > 0) {
        attachmentsPayload.media_urls = params.media_urls;
        attachmentsPayload.url = params.media_urls[0];
      }
      if (resolvedDoiMeta) attachmentsPayload.doi_metadata = resolvedDoiMeta;
      if (params.document_metadata) attachmentsPayload.document_metadata = params.document_metadata;
      if (params.workspace_invite_metadata) attachmentsPayload.workspace_invite_metadata = params.workspace_invite_metadata;
      if (params.post_metadata) attachmentsPayload.post_metadata = params.post_metadata;
      if (params.profile_metadata) attachmentsPayload.profile_metadata = params.profile_metadata;
      if (params.audio_metadata) attachmentsPayload.audio_metadata = params.audio_metadata;
      if (params.call_metadata) attachmentsPayload.call_metadata = params.call_metadata;
      if (params.poll_data) attachmentsPayload.poll_data = params.poll_data;

      // Try rich insert
      let insertPayload: any = {
        workspace_id: params.workspace_id,
        sender_id: user.id,
        content: params.content,
        message_type: detectedType,
        doi_metadata: resolvedDoiMeta,
        poll_data: params.poll_data || null,
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

      let extractedMedia: string[] | null = null;
      if (Array.isArray(data.media_urls) && data.media_urls.length > 0) {
        extractedMedia = data.media_urls;
      } else if (params.media_urls && params.media_urls.length > 0) {
        extractedMedia = params.media_urls;
      } else if (data.attachments?.media_urls) {
        extractedMedia = data.attachments.media_urls;
      } else if (data.attachments?.url) {
        extractedMedia = [data.attachments.url];
      }

      const msg: WorkspaceMessage = {
        id: data.id,
        workspace_id: data.workspace_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type || detectedType,
        doi_metadata: data.doi_metadata || data.attachments?.doi_metadata || resolvedDoiMeta || null,
        document_metadata: data.document_metadata || data.attachments?.document_metadata || params.document_metadata || null,
        workspace_invite_metadata: data.workspace_invite_metadata || data.attachments?.workspace_invite_metadata || params.workspace_invite_metadata || null,
        post_metadata: data.post_metadata || data.attachments?.post_metadata || params.post_metadata || null,
        profile_metadata: data.profile_metadata || data.attachments?.profile_metadata || params.profile_metadata || null,
        call_metadata: data.call_metadata || data.attachments?.call_metadata || params.call_metadata || null,
        audio_metadata: data.audio_metadata || data.attachments?.audio_metadata || params.audio_metadata || null,
        attachments: data.attachments || attachmentsPayload,
        e2ee_ciphertext: data.e2ee_ciphertext || null,
        e2ee_nonce: data.e2ee_nonce || null,
        media_urls: extractedMedia,
        is_pinned: data.is_pinned || false,
        reply_to_id: data.reply_to_id || null,
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
        sender: senderInfo,
      };

      // 1. Update workspace updated_at timestamp
      try {
        await supabase
          .from('workspaces')
          .update({ updated_at: msg.created_at })
          .eq('id', params.workspace_id);
      } catch {}

      // 2. Mark sender's own membership as read and reset unread_count
      try {
        await supabase
          .from('workspace_members')
          .update({
            last_read_at: msg.created_at,
            unread_count: 0,
          })
          .eq('workspace_id', params.workspace_id)
          .eq('user_id', user.id);
      } catch {}

      // 3. Increment unread_count for all other active members in this workspace
      try {
        const { data: otherMembers } = await supabase
          .from('workspace_members')
          .select('id, user_id, unread_count')
          .eq('workspace_id', params.workspace_id)
          .neq('user_id', user.id);

        if (otherMembers && otherMembers.length > 0) {
          for (const om of otherMembers) {
            await supabase
              .from('workspace_members')
              .update({ unread_count: (om.unread_count || 0) + 1 })
              .eq('id', om.id);
          }
        }
      } catch {}

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
      const { data: msg } = await supabase
        .from('workspace_messages')
        .select('id, attachments')
        .eq('id', messageId)
        .single();

      let currentAttachments: any = {};
      if (msg?.attachments && typeof msg.attachments === 'object' && !Array.isArray(msg.attachments)) {
        currentAttachments = { ...msg.attachments };
      }

      let currentReactions: Record<string, string[]> = {};
      if (currentAttachments.reactions && typeof currentAttachments.reactions === 'object' && !Array.isArray(currentAttachments.reactions)) {
        currentReactions = { ...currentAttachments.reactions };
      }

      const usersForEmoji = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];
      const userIndex = usersForEmoji.indexOf(userId);

      if (userIndex > -1) {
        usersForEmoji.splice(userIndex, 1);
      } else {
        usersForEmoji.push(userId);
      }

      const updated: Record<string, string[]> = { ...currentReactions };
      if (usersForEmoji.length > 0) {
        updated[emoji] = usersForEmoji;
      } else {
        delete updated[emoji];
      }

      currentAttachments.reactions = updated;

      // Persist to attachments
      try {
        await supabase
          .from('workspace_messages')
          .update({ attachments: currentAttachments })
          .eq('id', messageId);
      } catch {}

      return { reactions: updated, error: null };
    } catch (err: any) {
      return { reactions: {}, error: err.message || 'Failed to toggle reaction' };
    }
  },

  /**
   * Cast or update a poll vote with multi-layer persistence.
   * Stores to AsyncStorage locally, updates attachments on the message,
   * and logs a vote action record to workspace_messages so votes never vanish across app restarts.
   */
  async votePoll(
    workspaceId: string,
    messageId: string,
    optionId: string,
    userId: string
  ): Promise<{
    success: boolean;
    reactions: Record<string, string[]>;
    pollData?: WorkspacePollData;
    error: string | null;
  }> {
    try {
      // 1. Persist locally to AsyncStorage for instant restoration on this device
      const storageKey = `@booffin_poll_vote_${messageId}_${userId}`;
      try {
        if (optionId) {
          await AsyncStorage.setItem(storageKey, optionId);
        } else {
          await AsyncStorage.removeItem(storageKey);
        }
      } catch {}

      // 2. Fetch target poll message (ONLY query valid columns: id, attachments, content)
      const { data: msg } = await supabase
        .from('workspace_messages')
        .select('id, attachments, content')
        .eq('id', messageId)
        .single();

      let currentAttachments: any = {};
      if (msg?.attachments && typeof msg.attachments === 'object' && !Array.isArray(msg.attachments)) {
        currentAttachments = { ...msg.attachments };
      }

      let currentReactions: Record<string, string[]> = {};
      if (currentAttachments.reactions && typeof currentAttachments.reactions === 'object' && !Array.isArray(currentAttachments.reactions)) {
        currentReactions = { ...currentAttachments.reactions };
      }

      let currentPollData: WorkspacePollData | null = currentAttachments.poll_data || null;

      // Robust fallback: if attachments.poll_data is missing, reconstruct it from message content
      if (!currentPollData && typeof msg?.content === 'string' && msg.content.startsWith('📊 Poll:')) {
        const lines = msg.content.split('\n');
        const q = lines[0].replace('📊 Poll:', '').trim();
        const optLines = lines.slice(1).filter((l: string) => l.startsWith('• '));
        const options = optLines.map((l: string, idx: number) => ({
          id: `opt_${idx}`,
          text: l.replace('• ', '').trim(),
          votes: [] as string[],
        }));
        if (options.length > 0) {
          currentPollData = {
            question: q,
            options,
            totalVotes: 0,
          };
        }
      }

      // 3. Reconcile user vote in reactions map
      const updatedReactions: Record<string, string[]> = { ...currentReactions };
      Object.keys(updatedReactions).forEach((key) => {
        if (key.startsWith('vote:') && Array.isArray(updatedReactions[key])) {
          updatedReactions[key] = updatedReactions[key].filter((uid) => uid !== userId);
          if (updatedReactions[key].length === 0) {
            delete updatedReactions[key];
          }
        }
      });

      if (optionId) {
        const voteKey = `vote:${optionId}`;
        const users = Array.isArray(updatedReactions[voteKey]) ? [...updatedReactions[voteKey]] : [];
        if (!users.includes(userId)) {
          users.push(userId);
        }
        updatedReactions[voteKey] = users;
      }

      // 4. Reconcile user vote in poll_data
      let updatedPollData: WorkspacePollData | null = null;
      if (currentPollData && Array.isArray(currentPollData.options)) {
        const updatedOptions = currentPollData.options.map((opt) => {
          let votes: string[] = Array.isArray(opt.votes) ? opt.votes.filter((uid) => uid !== userId) : [];
          if (opt.id === optionId) {
            votes.push(userId);
          }
          return { ...opt, votes };
        });

        let total = 0;
        updatedOptions.forEach((opt) => {
          total += opt.votes.length;
        });

        updatedPollData = {
          ...currentPollData,
          options: updatedOptions,
          totalVotes: total,
        };
      }

      currentAttachments.reactions = updatedReactions;
      if (updatedPollData) {
        currentAttachments.poll_data = updatedPollData;
      }

      // 5. Direct message update attempt (succeeds if user is allowed to update)
      try {
        await supabase
          .from('workspace_messages')
          .update({
            attachments: currentAttachments,
          })
          .eq('id', messageId);
      } catch {}

      // 6. Guaranteed insert transaction (only valid columns: workspace_id, sender_id, content, attachments)
      try {
        const { error: insErr } = await supabase
          .from('workspace_messages')
          .insert({
            workspace_id: workspaceId,
            sender_id: userId,
            content: `🗳️ Vote: ${optionId || 'retracted'} [${messageId}]`,
            attachments: {
              is_poll_vote_action: true,
              poll_id: messageId,
              option_id: optionId || '',
              voter_id: userId,
              timestamp: new Date().toISOString(),
            },
          });
        if (insErr) {
          console.error('[workspaceService] vote record insert error:', insErr);
        }
      } catch (err) {
        console.warn('[workspaceService] vote record insert exception:', err);
      }

      // 7. Persist updated poll data into AsyncStorage cache as backup
      try {
        if (updatedPollData) {
          await AsyncStorage.setItem(`@booffin_poll_data_${messageId}`, JSON.stringify(updatedPollData));
        }
      } catch {}

      return {
        success: true,
        reactions: updatedReactions,
        pollData: updatedPollData || undefined,
        error: null,
      };
    } catch (err: any) {
      console.error('[workspaceService] votePoll error:', err);
      return { success: false, reactions: {}, error: err.message || 'Failed to submit vote' };
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
   * Add a mutual follower directly to the workspace
   */
  async addDirectMember(
    workspaceId: string,
    targetUserId: string,
    role: 'member' | 'moderator' | 'admin' = 'member'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspaceId,
          user_id: targetUserId,
          role,
          status: 'active',
          joined_at: new Date().toISOString(),
        },
        { onConflict: 'workspace_id,user_id' }
      );

      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to add member' };
    }
  },

  /**
   * Send a direct workspace invitation message to a researcher in their DM chat
   */
  async sendWorkspaceInvitation(
    workspace: Workspace,
    targetUserId: string,
    inviterId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // 1. Get or create 1-to-1 DM workspace
      const canonicalKey = [inviterId, targetUserId].sort().join(':');
      let dmWorkspaceId: string | null = null;

      const { data: existing } = await supabase
        .from('workspaces')
        .select('id')
        .eq('canonical_dm_key', canonicalKey)
        .maybeSingle();

      if (existing?.id) {
        dmWorkspaceId = existing.id;
      } else {
        const userA = inviterId < targetUserId ? inviterId : targetUserId;
        const userB = inviterId > targetUserId ? inviterId : targetUserId;
        const { data: newWs, error: insertErr } = await supabase
          .from('workspaces')
          .insert({
            type: 'dm',
            owner_id: inviterId,
            creator_id: inviterId,
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

        if (newWs?.id) {
          dmWorkspaceId = newWs.id;
          await supabase.from('workspace_members').upsert([
            { workspace_id: newWs.id, user_id: inviterId, role: 'member', status: 'active' },
            { workspace_id: newWs.id, user_id: targetUserId, role: 'member', status: 'active' },
          ]);
        }
      }

      if (!dmWorkspaceId) {
        return { success: false, error: 'Could not establish DM chat' };
      }

      // 2. Send workspace invite message
      const inviteMeta: WorkspaceInviteMetadata = {
        id: workspace.id,
        name: workspace.name,
        type: workspace.type === 'inner_circle' ? 'inner_circle' : 'community',
        avatarUrl: workspace.avatar_url,
        description: workspace.description,
        members_count: workspace.members_count,
      };

      const inviteUrl = `https://booffin.com/join/${workspace.id}`;
      const msgContent = `🤝 Invited you to join ${workspace.name}:\n${inviteUrl}`;

      await this.sendMessage({
        workspace_id: dmWorkspaceId,
        content: msgContent,
        message_type: 'workspace_invite',
        workspace_invite_metadata: inviteMeta,
      });

      // 3. Mark in workspace_members as 'invited'
      await supabase.from('workspace_members').upsert(
        {
          workspace_id: workspace.id,
          user_id: targetUserId,
          role: 'member',
          status: 'invited',
        },
        { onConflict: 'workspace_id,user_id' }
      );

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send invite' };
    }
  },

  /**
   * Fetch followers and followings for member picker with mutual relation flag
   */
  async getFollowersAndFollowing(userId: string): Promise<{
    researchers: Array<{
      id: string;
      fullName: string;
      handle: string;
      avatarUrl?: string | null;
      academicTitle?: string | null;
      institution?: string | null;
      isMutual: boolean;
      isFollowing: boolean;
      isFollower: boolean;
    }>;
    error: string | null;
  }> {
    try {
      const [followingRes, followerRes] = await Promise.all([
        supabase.from('follows').select('following_id').eq('follower_id', userId),
        supabase.from('follows').select('follower_id').eq('following_id', userId),
      ]);

      const followingIds = (followingRes.data || []).map((r: any) => r.following_id).filter(Boolean);
      const followerIds = (followerRes.data || []).map((r: any) => r.follower_id).filter(Boolean);

      const followingSet = new Set<string>(followingIds);
      const followerSet = new Set<string>(followerIds);
      const allUserIds = Array.from(new Set([...followingIds, ...followerIds])).filter((id) => id !== userId);

      // If user has 0 follows/followers in dev/testing, fetch other profiles as discoverable suggestions
      if (allUserIds.length === 0) {
        const { data: suggestions } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, academic_title, institution')
          .neq('id', userId)
          .limit(25);

        if (suggestions && suggestions.length > 0) {
          return {
            researchers: suggestions.map((p: any) => ({
              id: p.id,
              fullName: p.full_name || p.username || 'Researcher',
              handle: p.username || 'researcher',
              avatarUrl: p.avatar_url || null,
              academicTitle: p.academic_title || null,
              institution: p.institution || null,
              isMutual: true, // Allow direct adding for suggestions
              isFollowing: false,
              isFollower: false,
            })),
            error: null,
          };
        }
      }

      // Fetch profiles for all followed/follower userIds
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, academic_title, institution')
        .in('id', allUserIds);

      const list = (profs || []).map((p: any) => {
        const isFollowing = followingSet.has(p.id);
        const isFollower = followerSet.has(p.id);
        const isMutual = isFollowing && isFollower;
        return {
          id: p.id,
          fullName: p.full_name || p.username || 'Researcher',
          handle: p.username || 'researcher',
          avatarUrl: p.avatar_url || null,
          academicTitle: p.academic_title || null,
          institution: p.institution || null,
          isMutual: isMutual || (!isFollowing && !isFollower),
          isFollowing,
          isFollower,
        };
      });

      // Sort: mutual first, then alphabetically
      list.sort((a, b) => {
        if (a.isMutual && !b.isMutual) return -1;
        if (!a.isMutual && b.isMutual) return 1;
        return a.fullName.localeCompare(b.fullName);
      });

      return { researchers: list, error: null };
    } catch (err: any) {
      return { researchers: [], error: err.message || 'Failed to load connections' };
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
   * Update member role in workspace (e.g. promote to admin / moderator or demote to member)
   */
  async updateMemberRole(
    workspaceId: string,
    targetUserId: string,
    newRole: 'owner' | 'admin' | 'moderator' | 'member'
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update member role' };
    }
  },

  /**
   * Ban member from workspace and remove from membership
   */
  async banWorkspaceMember(
    workspaceId: string,
    targetUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'User not authenticated' };

      // 1. Insert into workspace_blocks
      await supabase.from('workspace_blocks').upsert({
        workspace_id: workspaceId,
        user_id: targetUserId,
        blocked_by: user.id,
        reason: reason || 'Banned by pod admin',
      });

      // 2. Remove from workspace_members
      const { error: delErr } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      if (delErr) {
        return { success: false, error: delErr.message };
      }
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to ban member' };
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
   * Toggle Pin conversation for user
   */
  async togglePinWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<{ success: boolean; isPinned: boolean; error: string | null }> {
    try {
      const prefs = await getChatPreferences(userId);
      const isCurrentlyPinned = prefs.pinned.includes(workspaceId);
      const newPinned = isCurrentlyPinned
        ? prefs.pinned.filter((id) => id !== workspaceId)
        : [workspaceId, ...prefs.pinned];

      await saveChatPreferences(userId, { ...prefs, pinned: newPinned });
      return { success: true, isPinned: !isCurrentlyPinned, error: null };
    } catch (err: any) {
      return { success: false, isPinned: false, error: err.message || 'Failed to toggle pin' };
    }
  },

  /**
   * Toggle Archive conversation for user
   */
  async toggleArchiveWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<{ success: boolean; isArchived: boolean; error: string | null }> {
    try {
      const prefs = await getChatPreferences(userId);
      const isCurrentlyArchived = prefs.archived.includes(workspaceId);
      const newArchived = isCurrentlyArchived
        ? prefs.archived.filter((id) => id !== workspaceId)
        : [workspaceId, ...prefs.archived];

      await saveChatPreferences(userId, { ...prefs, archived: newArchived });
      return { success: true, isArchived: !isCurrentlyArchived, error: null };
    } catch (err: any) {
      return { success: false, isArchived: false, error: err.message || 'Failed to toggle archive' };
    }
  },

  /**
   * Mute or Unmute notifications for a conversation
   */
  async setMuteWorkspace(
    userId: string,
    workspaceId: string,
    isMuted: boolean,
    mutedUntil?: string | null
  ): Promise<{ success: boolean; isMuted: boolean; error: string | null }> {
    try {
      const prefs = await getChatPreferences(userId);
      const newMuted = {
        ...prefs.muted,
        [workspaceId]: { isMuted, until: mutedUntil || null },
      };

      await saveChatPreferences(userId, { ...prefs, muted: newMuted });

      // Also update workspace_members in Supabase if a member record exists
      try {
        await supabase
          .from('workspace_members')
          .update({ is_muted: isMuted })
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId);
      } catch {}

      return { success: true, isMuted, error: null };
    } catch (err: any) {
      return { success: false, isMuted: false, error: err.message || 'Failed to update mute status' };
    }
  },

  /**
   * Clear all messages in chat history for this user
   */
  async clearChatHistory(
    userId: string,
    workspaceId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const prefs = await getChatPreferences(userId);
      const newCleared = {
        ...prefs.clearedAt,
        [workspaceId]: new Date().toISOString(),
      };

      await saveChatPreferences(userId, { ...prefs, clearedAt: newCleared });
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to clear chat history' };
    }
  },

  /**
   * Delete conversation locally for this user
   */
  async deleteWorkspaceLocally(
    userId: string,
    workspaceId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const prefs = await getChatPreferences(userId);
      const newDeleted = Array.from(new Set([...prefs.deleted, workspaceId]));
      const newPinned = prefs.pinned.filter((id) => id !== workspaceId);
      const newArchived = prefs.archived.filter((id) => id !== workspaceId);

      await saveChatPreferences(userId, {
        ...prefs,
        deleted: newDeleted,
        pinned: newPinned,
        archived: newArchived,
      });

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete conversation locally' };
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
