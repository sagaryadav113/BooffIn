import { create } from 'zustand';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceEvent,
  WorkspaceRoleOpportunity,
  WorkspaceSavedItem,
  WorkspaceBlock,
  WorkspaceSubscriptionTier,
  WorkspaceMessageType,
  WorkspaceAudioMetadata,
  WorkspacePostMetadata,
  WorkspaceProfileMetadata,
  WorkspaceInviteMetadata,
  WorkspaceDocumentMetadata,
  WorkspaceCallMetadata,
  DoiMetadata,
} from '../types/workspace';
import { workspaceService } from '../api/workspaceService';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../api/client';
import { fetchUserProfile } from '../api/authService';

export type WorkspaceHubTab = 'all' | 'dms' | 'communities' | 'inner_circles';

interface WorkspaceState {
  // Lists
  dms: Workspace[];
  communities: Workspace[];
  innerCircles: Workspace[];
  discoverableCommunities: Workspace[];

  // Active Workspace Room State
  activeWorkspace: Workspace | null;
  messages: WorkspaceMessage[];
  events: WorkspaceEvent[];
  opportunities: WorkspaceRoleOpportunity[];
  savedItems: WorkspaceSavedItem[];
  blocks: WorkspaceBlock[];
  members: WorkspaceMember[];

  // Global State
  unreadTotal: number;
  activeHubTab: WorkspaceHubTab;
  typingUsers: Record<string, Record<string, { username: string; timestamp: number }>>;
  otherLastReadMap: Record<string, string>;
  isLoading: boolean;
  isRefreshing: boolean;
  isMessagesLoading: boolean;
  isMembersLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  setActiveHubTab: (tab: WorkspaceHubTab) => void;
  sendTypingIndicator: (workspaceId: string, isTyping: boolean) => void;
  loadWorkspaces: (refresh?: boolean) => Promise<void>;
  loadWorkspaceDetails: (workspaceId: string) => Promise<Workspace | null>;
  loadMembers: (workspaceId: string) => Promise<void>;
  inviteToInnerCircle: (
    workspaceId: string,
    targetUserId: string,
    role?: 'member' | 'moderator' | 'admin'
  ) => Promise<{ success: boolean; error: string | null }>;
  removeMember: (
    workspaceId: string,
    targetUserId: string
  ) => Promise<{ success: boolean; error: string | null }>;
  updateMemberRole: (
    workspaceId: string,
    targetUserId: string,
    newRole: 'owner' | 'admin' | 'moderator' | 'member'
  ) => Promise<{ success: boolean; error: string | null }>;
  banMember: (
    workspaceId: string,
    targetUserId: string,
    reason?: string
  ) => Promise<{ success: boolean; error: string | null }>;
  leaveWorkspace: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  loadMessages: (workspaceId: string) => Promise<void>;
  sendMessage: (params: {
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
  }) => Promise<{ success: boolean; error: string | null }>;
  toggleReaction: (
    messageId: string,
    emoji: string
  ) => Promise<{ success: boolean; reactions: Record<string, string[]>; error: string | null }>;
  editMessage: (
    messageId: string,
    newContent: string
  ) => Promise<{ success: boolean; error: string | null }>;
  deleteMessage: (
    messageId: string,
    deleteForEveryone?: boolean
  ) => Promise<{ success: boolean; error: string | null }>;
  forwardMessage: (
    targetWorkspaceId: string,
    message: WorkspaceMessage
  ) => Promise<{ success: boolean; error: string | null }>;
  markAsRead: (workspaceId: string) => Promise<void>;
  loadEvents: (workspaceId: string) => Promise<void>;
  createEvent: (params: {
    workspaceId: string;
    title: string;
    description?: string;
    eventType: 'live_session' | 'reading_group' | 'lab_meeting' | 'milestone';
    startTime: string;
    endTime?: string;
    meetingLink?: string;
  }) => Promise<{ success: boolean; error: string | null }>;
  loadOpportunities: (workspaceId: string) => Promise<void>;
  createOpportunity: (params: {
    workspaceId: string;
    title: string;
    roleType: 'co_author' | 'research_assistant' | 'reviewer' | 'grant_partner' | 'postdoc';
    description: string;
    compensation?: string;
  }) => Promise<{ success: boolean; error: string | null }>;
  loadSavedItems: (workspaceId: string) => Promise<void>;
  saveItem: (params: {
    workspaceId: string;
    itemType: 'message' | 'doi_paper' | 'opportunity' | 'event';
    itemId: string;
    note?: string;
  }) => Promise<{ success: boolean; error: string | null }>;
  removeSavedItem: (workspaceId: string, itemId: string) => Promise<void>;
  loadBlocks: (workspaceId: string) => Promise<void>;
  blockMember: (params: {
    workspaceId: string;
    targetUserId: string;
    reason: string;
  }) => Promise<{ success: boolean; error: string | null }>;
  startDM: (targetUserId: string) => Promise<{
    workspaceId: string | null;
    error: string | null;
    requiresMutualFollow?: boolean;
  }>;
  createCommunity: (params: {
    name: string;
    description?: string;
    subscription_tier: WorkspaceSubscriptionTier;
    is_private?: boolean;
    avatar_url?: string;
    banner_url?: string;
    member_ids?: string[];
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  createInnerCircle: (params: {
    name: string;
    description?: string;
    e2ee_enabled?: boolean;
    avatar_url?: string;
    member_ids?: string[];
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  joinCommunity: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  updateWorkspaceDetails: (
    workspaceId: string,
    updates: {
      name?: string;
      description?: string | null;
      avatar_url?: string | null;
      banner_url?: string | null;
      settings?: Record<string, any>;
    }
  ) => Promise<{ success: boolean; error: string | null }>;
  togglePinWorkspace: (workspaceId: string) => Promise<{ success: boolean; isPinned: boolean; error: string | null }>;
  toggleArchiveWorkspace: (workspaceId: string) => Promise<{ success: boolean; isArchived: boolean; error: string | null }>;
  setMuteWorkspace: (
    workspaceId: string,
    isMuted: boolean,
    mutedUntil?: string | null
  ) => Promise<{ success: boolean; isMuted: boolean; error: string | null }>;
  clearChatHistory: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  deleteWorkspaceLocally: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  refreshUnreadTotal: () => Promise<void>;
  subscribeToWorkspaceMessages: (workspaceId: string) => () => void;
  subscribeToGlobalWorkspaceUpdates: (userId: string) => () => void;
}

const activeWorkspaceChannels = new Map<string, any>();

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  dms: [],
  communities: [],
  innerCircles: [],
  discoverableCommunities: [],
  activeWorkspace: null,
  messages: [],
  events: [],
  opportunities: [],
  savedItems: [],
  blocks: [],
  members: [],
  unreadTotal: 0,
  activeHubTab: 'all',
  typingUsers: {},
  otherLastReadMap: {},
  isLoading: false,
  isRefreshing: false,
  isMessagesLoading: false,
  isMembersLoading: false,
  isSending: false,
  error: null,

  setActiveHubTab: (tab: WorkspaceHubTab) => set({ activeHubTab: tab }),

  sendTypingIndicator: (workspaceId: string, isTyping: boolean) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !workspaceId) return;
    let channel = activeWorkspaceChannels.get(workspaceId);
    if (!channel) {
      channel = supabase.channel(`workspace_room:${workspaceId}`, {
        config: { broadcast: { self: false } },
      });
      activeWorkspaceChannels.set(workspaceId, channel);
      channel.subscribe();
    }
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        workspaceId,
        userId: currentUser.id,
        username: currentUser.fullName || currentUser.handle || 'Researcher',
        isTyping,
        timestamp: Date.now(),
      },
    });
  },

  loadWorkspaces: async (refresh = false) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    if (refresh) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const res = await workspaceService.getWorkspaces(currentUser.id);
      if (res.error) {
        set({ error: res.error, isLoading: false, isRefreshing: false });
      } else {
        const totalUnread =
          res.dms.reduce((acc, d) => acc + (d.unread_count || 0), 0) +
          res.communities.reduce((acc, c) => acc + (c.unread_count || 0), 0) +
          res.innerCircles.reduce((acc, i) => acc + (i.unread_count || 0), 0);

        set({
          dms: res.dms,
          communities: res.communities,
          innerCircles: res.innerCircles,
          discoverableCommunities: res.discoverableCommunities,
          unreadTotal: totalUnread,
          isLoading: false,
          isRefreshing: false,
        });
      }
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load workspaces',
        isLoading: false,
        isRefreshing: false,
      });
    }
  },

  loadWorkspaceDetails: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    try {
      const res = await workspaceService.getWorkspaceById(workspaceId, currentUser?.id);
      if (res.workspace) {
        set({ activeWorkspace: res.workspace });
        return res.workspace;
      }
      return null;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },

  loadMembers: async (workspaceId: string) => {
    set({ isMembersLoading: true });
    try {
      const res = await workspaceService.getWorkspaceMembers(workspaceId);
      if (!res.error) {
        set({ members: res.members, isMembersLoading: false });
      } else {
        set({ isMembersLoading: false });
      }
    } catch {
      set({ isMembersLoading: false });
    }
  },

  inviteToInnerCircle: async (workspaceId: string, targetUserId: string, role = 'member') => {
    const res = await workspaceService.inviteToInnerCircle(workspaceId, targetUserId, role);
    if (res.success) {
      await get().loadMembers(workspaceId);
      await get().loadWorkspaceDetails(workspaceId);
    }
    return res;
  },

  removeMember: async (workspaceId: string, targetUserId: string) => {
    const res = await workspaceService.removeWorkspaceMember(workspaceId, targetUserId);
    if (res.success) {
      set((state) => ({
        members: state.members.filter((m) => m.user_id !== targetUserId),
      }));
      await get().loadWorkspaceDetails(workspaceId);
    }
    return res;
  },

  updateMemberRole: async (workspaceId: string, targetUserId: string, newRole) => {
    const res = await workspaceService.updateMemberRole(workspaceId, targetUserId, newRole);
    if (res.success) {
      set((state) => ({
        members: state.members.map((m) =>
          m.user_id === targetUserId ? { ...m, role: newRole } : m
        ),
      }));
      await get().loadWorkspaceDetails(workspaceId);
    }
    return res;
  },

  banMember: async (workspaceId: string, targetUserId: string, reason) => {
    const res = await workspaceService.banWorkspaceMember(workspaceId, targetUserId, reason);
    if (res.success) {
      set((state) => ({
        members: state.members.filter((m) => m.user_id !== targetUserId),
      }));
      await get().loadWorkspaceDetails(workspaceId);
    }
    return res;
  },

  leaveWorkspace: async (workspaceId: string) => {
    const res = await workspaceService.leaveWorkspace(workspaceId);
    if (res.success) {
      await get().loadWorkspaces(true);
    }
    return res;
  },

  loadMessages: async (workspaceId: string) => {
    set({ isMessagesLoading: true, error: null });
    try {
      const res = await workspaceService.getMessages(workspaceId);
      if (res.error) {
        set({ isMessagesLoading: false, error: res.error });
      } else {
        set({ messages: res.messages, isMessagesLoading: false });
        // Mark as read immediately
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          get().markAsRead(workspaceId);
        }
      }
    } catch (err: any) {
      set({ isMessagesLoading: false, error: err.message });
    }
  },

  sendMessage: async (params) => {
    set({ isSending: true });
    try {
      const res = await workspaceService.sendMessage(params);
      if (res.error || !res.message) {
        set({ isSending: false });
        return { success: false, error: res.error || 'Failed to send' };
      }

      // Optimistically append message if not already present
      set((state) => {
        const exists = state.messages.some((m) => m.id === res.message!.id);
        if (exists) return { isSending: false };
        return {
          messages: [...state.messages, res.message!],
          isSending: false,
        };
      });

      // Instant 0ms broadcast to all other room participants
      const channel = activeWorkspaceChannels.get(params.workspace_id);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            message: res.message,
          },
        });
        // Clear typing status
        const currentUser = useAuthStore.getState().user;
        channel.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            workspaceId: params.workspace_id,
            userId: currentUser?.id,
            isTyping: false,
          },
        });
      }

      return { success: true, error: null };
    } catch (err: any) {
      set({ isSending: false });
      return { success: false, error: err.message || 'Failed to send' };
    }
  },

  toggleReaction: async (messageId, emoji) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return { success: false, reactions: {}, error: 'Not authenticated' };

    // Optimistic local update
    let updatedReactions: Record<string, string[]> = {};
    let targetWorkspaceId: string | null = null;
    set((state) => {
      const msgs = state.messages.map((m) => {
        if (m.id === messageId) {
          targetWorkspaceId = m.workspace_id;
          const current = { ...(m.reactions || {}) };
          const users = Array.isArray(current[emoji]) ? [...current[emoji]] : [];
          const idx = users.indexOf(currentUser.id);
          if (idx > -1) {
            users.splice(idx, 1);
          } else {
            users.push(currentUser.id);
          }
          if (users.length > 0) {
            current[emoji] = users;
          } else {
            delete current[emoji];
          }
          updatedReactions = current;
          return { ...m, reactions: current };
        }
        return m;
      });
      return { messages: msgs };
    });

    if (targetWorkspaceId) {
      const channel = activeWorkspaceChannels.get(targetWorkspaceId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: {
            workspaceId: targetWorkspaceId,
            action: 'reaction',
            messageId,
            reactions: updatedReactions,
          },
        });
      }
    }

    try {
      const res = await workspaceService.toggleReaction(messageId, emoji, currentUser.id);
      if (res.error) {
        return { success: false, reactions: updatedReactions, error: res.error };
      }
      return { success: true, reactions: res.reactions, error: null };
    } catch (err: any) {
      return { success: false, reactions: updatedReactions, error: err.message };
    }
  },

  editMessage: async (messageId, newContent) => {
    let targetWorkspaceId: string | null = null;
    // Optimistic update
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id === messageId) {
          targetWorkspaceId = m.workspace_id;
          return { ...m, content: newContent.trim(), is_edited: true, updated_at: new Date().toISOString() };
        }
        return m;
      }),
    }));

    if (targetWorkspaceId) {
      const channel = activeWorkspaceChannels.get(targetWorkspaceId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: {
            workspaceId: targetWorkspaceId,
            action: 'edit',
            messageId,
            newContent: newContent.trim(),
          },
        });
      }
    }

    try {
      const res = await workspaceService.editMessage(messageId, newContent);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteMessage: async (messageId, deleteForEveryone = true) => {
    let targetWorkspaceId: string | null = null;
    // Optimistic update
    set((state) => ({
      messages: deleteForEveryone
        ? state.messages.map((m) => {
            if (m.id === messageId) {
              targetWorkspaceId = m.workspace_id;
              return {
                ...m,
                content: '🚫 This message was deleted',
                is_deleted: true,
                media_urls: null,
                doi_metadata: null,
              };
            }
            return m;
          })
        : state.messages.filter((m) => {
            if (m.id === messageId) targetWorkspaceId = m.workspace_id;
            return m.id !== messageId;
          }),
    }));

    if (targetWorkspaceId && deleteForEveryone) {
      const channel = activeWorkspaceChannels.get(targetWorkspaceId);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'message_updated',
          payload: {
            workspaceId: targetWorkspaceId,
            action: 'delete',
            messageId,
            deleteForEveryone: true,
          },
        });
      }
    }

    try {
      const res = await workspaceService.deleteMessage(messageId, deleteForEveryone);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  forwardMessage: async (targetWorkspaceId, message) => {
    try {
      const res = await workspaceService.forwardMessage(targetWorkspaceId, message);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  markAsRead: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const now = new Date().toISOString();
    await workspaceService.markWorkspaceAsRead(workspaceId, currentUser.id);

    // Broadcast instant read receipt so sender's ticks immediately turn green
    const channel = activeWorkspaceChannels.get(workspaceId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'read_receipt',
        payload: {
          workspaceId,
          userId: currentUser.id,
          lastReadAt: now,
        },
      });
    }

    // Update local state unread badge
    set((state) => {
      const updateUnread = (list: Workspace[]) =>
        list.map((w) => (w.id === workspaceId ? { ...w, unread_count: 0 } : w));

      const newDms = updateUnread(state.dms);
      const newComms = updateUnread(state.communities);
      const newInners = updateUnread(state.innerCircles);
      const newTotal =
        newDms.reduce((acc, d) => acc + (d.unread_count || 0), 0) +
        newComms.reduce((acc, c) => acc + (c.unread_count || 0), 0) +
        newInners.reduce((acc, i) => acc + (i.unread_count || 0), 0);

      return {
        dms: newDms,
        communities: newComms,
        innerCircles: newInners,
        unreadTotal: newTotal,
      };
    });
  },

  loadEvents: async (workspaceId: string) => {
    const res = await workspaceService.getWorkspaceEvents(workspaceId);
    if (!res.error) {
      set({ events: res.events });
    }
  },

  createEvent: async (params) => {
    const res = await workspaceService.createWorkspaceEvent(params);
    if (res.error || !res.event) {
      return { success: false, error: res.error || 'Failed to create event' };
    }
    await get().loadEvents(params.workspaceId);
    return { success: true, error: null };
  },

  loadOpportunities: async (workspaceId: string) => {
    const res = await workspaceService.getWorkspaceRolesOpportunities(workspaceId);
    if (!res.error) {
      set({ opportunities: res.opportunities });
    }
  },

  createOpportunity: async (params) => {
    const res = await workspaceService.createWorkspaceRoleOpportunity(params);
    if (res.error || !res.opportunity) {
      return { success: false, error: res.error || 'Failed to post opportunity' };
    }
    await get().loadOpportunities(params.workspaceId);
    return { success: true, error: null };
  },

  loadSavedItems: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const res = await workspaceService.getWorkspaceSavedItems(workspaceId, currentUser.id);
    if (!res.error) {
      set({ savedItems: res.savedItems });
    }
  },

  saveItem: async (params) => {
    const res = await workspaceService.saveWorkspaceItem(params);
    if (res.success) {
      await get().loadSavedItems(params.workspaceId);
    }
    return res;
  },

  removeSavedItem: async (workspaceId: string, itemId: string) => {
    const res = await workspaceService.removeSavedWorkspaceItem(workspaceId, itemId);
    if (res.success) {
      set((state) => ({
        savedItems: state.savedItems.filter((i) => i.item_id !== itemId),
      }));
    }
  },

  loadBlocks: async (workspaceId: string) => {
    const res = await workspaceService.getWorkspaceBlocks(workspaceId);
    if (!res.error) {
      set({ blocks: res.blocks });
    }
  },

  blockMember: async (params) => {
    const res = await workspaceService.blockWorkspaceMember(params);
    if (res.success) {
      await get().loadBlocks(params.workspaceId);
    }
    return res;
  },

  startDM: async (targetUserId: string) => {
    return await workspaceService.getOrCreateDMWorkspace(targetUserId);
  },

  createCommunity: async (params) => {
    const res = await workspaceService.createCommunityWorkspace(params);
    if (res.workspace) {
      await get().loadWorkspaces(true);
    }
    return res;
  },

  createInnerCircle: async (params) => {
    const res = await workspaceService.createInnerCircleWorkspace(params);
    if (res.workspace) {
      await get().loadWorkspaces(true);
    }
    return res;
  },

  joinCommunity: async (workspaceId: string) => {
    const res = await workspaceService.joinCommunity(workspaceId);
    if (res.success) {
      await get().loadWorkspaces(true);
    }
    return res;
  },

  togglePinWorkspace: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) return { success: false, isPinned: false, error: 'Not authenticated' };

    // Optimistically update store
    let nextPinned = false;
    set((state) => {
      const target = state.dms.find((d) => d.id === workspaceId);
      nextPinned = !target?.is_pinned;
      const updatedDms = state.dms.map((d) =>
        d.id === workspaceId ? { ...d, is_pinned: nextPinned } : d
      );
      // Sort pinned to top
      updatedDms.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      });
      return { dms: updatedDms };
    });

    return await workspaceService.togglePinWorkspace(currentUser.id, workspaceId);
  },

  updateWorkspaceDetails: async (workspaceId, updates) => {
    try {
      // Optimistically update store lists
      set((state) => {
        const updater = (w: Workspace) =>
          w.id === workspaceId
            ? {
                ...w,
                ...(updates.name !== undefined ? { name: updates.name } : {}),
                ...(updates.description !== undefined ? { description: updates.description } : {}),
                ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
                ...(updates.banner_url !== undefined ? { banner_url: updates.banner_url } : {}),
                ...(updates.settings !== undefined
                  ? { settings: { ...(w.settings || {}), ...updates.settings } }
                  : {}),
              }
            : w;

        return {
          dms: state.dms.map(updater),
          communities: state.communities.map(updater),
          innerCircles: state.innerCircles.map(updater),
          activeWorkspace: state.activeWorkspace?.id === workspaceId ? updater(state.activeWorkspace) : state.activeWorkspace,
        };
      });

      const res = await workspaceService.updateWorkspaceDetails(workspaceId, updates);
      if (res.success) {
        await get().loadWorkspaces(true);
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  toggleArchiveWorkspace: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) return { success: false, isArchived: false, error: 'Not authenticated' };

    // Optimistically update store
    let nextArchived = false;
    set((state) => {
      const target = state.dms.find((d) => d.id === workspaceId);
      nextArchived = !target?.is_archived;
      const updatedDms = state.dms.map((d) =>
        d.id === workspaceId ? { ...d, is_archived: nextArchived } : d
      );
      return { dms: updatedDms };
    });

    return await workspaceService.toggleArchiveWorkspace(currentUser.id, workspaceId);
  },

  setMuteWorkspace: async (workspaceId: string, isMuted: boolean, mutedUntil?: string | null) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) return { success: false, isMuted: false, error: 'Not authenticated' };

    // Optimistically update store
    set((state) => {
      const updatedDms = state.dms.map((d) =>
        d.id === workspaceId
          ? { ...d, is_muted: isMuted, muted_until: mutedUntil || null }
          : d
      );
      return { dms: updatedDms };
    });

    return await workspaceService.setMuteWorkspace(currentUser.id, workspaceId, isMuted, mutedUntil);
  },

  clearChatHistory: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) return { success: false, error: 'Not authenticated' };

    // Clear local messages immediately
    set({ messages: [] });

    return await workspaceService.clearChatHistory(currentUser.id, workspaceId);
  },

  deleteWorkspaceLocally: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) return { success: false, error: 'Not authenticated' };

    // Remove from local list immediately
    set((state) => ({
      dms: state.dms.filter((d) => d.id !== workspaceId),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? null : state.activeWorkspace,
    }));

    return await workspaceService.deleteWorkspaceLocally(currentUser.id, workspaceId);
  },

  refreshUnreadTotal: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const count = await workspaceService.getUnreadCount(currentUser.id);
    set({ unreadTotal: count });
  },

  subscribeToWorkspaceMessages: (workspaceId: string) => {
    // 1. Establish dedicated real-time room channel with broadcast support
    const channel = supabase.channel(`workspace_room:${workspaceId}`, {
      config: { broadcast: { self: false } },
    });

    activeWorkspaceChannels.set(workspaceId, channel);

    channel
      // A. Realtime Instant Broadcast: New Message (0ms latency)
      .on('broadcast', { event: 'new_message' }, async ({ payload }: any) => {
        if (!payload?.message || payload.message.workspace_id !== workspaceId) return;
        const msg = payload.message as WorkspaceMessage;

        set((state) => {
          if (state.messages.some((m) => m.id === msg.id)) {
            return {
              messages: state.messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
            };
          }
          return {
            messages: [...state.messages, msg],
          };
        });

        // Mark as read if user is viewing chat and message is from other user
        const currentUserId = useAuthStore.getState().user?.id;
        if (currentUserId && msg.sender_id !== currentUserId) {
          get().markAsRead(workspaceId);
        }
      })
      // B. Realtime Instant Broadcast: Typing Indicator
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (!payload || payload.workspaceId !== workspaceId) return;
        const currentUserId = useAuthStore.getState().user?.id;
        if (payload.userId === currentUserId) return;

        set((state) => {
          const roomTyping = { ...(state.typingUsers[workspaceId] || {}) };
          if (payload.isTyping) {
            roomTyping[payload.userId] = {
              username: payload.username || 'Researcher',
              timestamp: payload.timestamp || Date.now(),
            };
          } else {
            delete roomTyping[payload.userId];
          }
          return {
            typingUsers: {
              ...state.typingUsers,
              [workspaceId]: roomTyping,
            },
          };
        });

        // Auto clear typing status after 4 seconds of inactivity if no explicit stop event
        if (payload.isTyping) {
          setTimeout(() => {
            set((state) => {
              const currentRoomTyping = state.typingUsers[workspaceId];
              if (currentRoomTyping && currentRoomTyping[payload.userId]) {
                const updatedRoom = { ...currentRoomTyping };
                delete updatedRoom[payload.userId];
                return {
                  typingUsers: {
                    ...state.typingUsers,
                    [workspaceId]: updatedRoom,
                  },
                };
              }
              return state;
            });
          }, 4000);
        }
      })
      // C. Realtime Instant Broadcast: Read Receipts (Green Ticks)
      .on('broadcast', { event: 'read_receipt' }, ({ payload }: any) => {
        if (!payload || payload.workspaceId !== workspaceId) return;
        const currentUserId = useAuthStore.getState().user?.id;
        if (payload.userId === currentUserId) return;

        set((state) => ({
          otherLastReadMap: {
            ...state.otherLastReadMap,
            [workspaceId]: payload.lastReadAt,
          },
        }));
      })
      // D. Realtime Instant Broadcast: Message Updates (Reactions, Edits, Deletions)
      .on('broadcast', { event: 'message_updated' }, ({ payload }: any) => {
        if (!payload || payload.workspaceId !== workspaceId) return;
        if (payload.action === 'delete') {
          set((state) => ({
            messages: payload.deleteForEveryone
              ? state.messages.map((m) =>
                  m.id === payload.messageId
                    ? {
                        ...m,
                        content: '🚫 This message was deleted',
                        is_deleted: true,
                        media_urls: null,
                        doi_metadata: null,
                      }
                    : m
                )
              : state.messages.filter((m) => m.id !== payload.messageId),
          }));
        } else if (payload.action === 'edit') {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === payload.messageId
                ? { ...m, content: payload.newContent, is_edited: true, updated_at: new Date().toISOString() }
                : m
            ),
          }));
        } else if (payload.action === 'reaction') {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === payload.messageId
                ? { ...m, reactions: payload.reactions }
                : m
            ),
          }));
        }
      })
      // E. Postgres Changes for Workspace Messages (Resilience & Background Sync)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) {
              set((state) => ({
                messages: state.messages.filter((m) => m.id !== oldId),
              }));
            }
            return;
          }

          const newMsg = payload.new;
          if (!newMsg || !newMsg.id) return;

          // Fetch sender profile if not populated
          let senderProfile = undefined;
          if (newMsg.sender_id) {
            const prof = await fetchUserProfile(newMsg.sender_id);
            if (prof) {
              senderProfile = {
                id: prof.id,
                fullName: prof.fullName || prof.handle || 'Researcher',
                handle: prof.handle,
                avatarUrl: prof.avatarUrl || null,
                academicTitle: prof.academicTitle,
                institution: prof.institution,
                orcidVerified: prof.orcidVerified,
              };
            }
          }

          let extractedMedia: string[] | null = null;
          if (Array.isArray(newMsg.media_urls) && newMsg.media_urls.length > 0) {
            extractedMedia = newMsg.media_urls;
          } else if (Array.isArray(newMsg.attachments) && newMsg.attachments.length > 0) {
            extractedMedia = newMsg.attachments
              .map((a: any) => (typeof a === 'string' ? a : a?.url || a?.uri))
              .filter(Boolean);
          } else if (newMsg.attachments && typeof newMsg.attachments === 'object') {
            if (Array.isArray(newMsg.attachments.media_urls)) {
              extractedMedia = newMsg.attachments.media_urls;
            } else if (newMsg.attachments.url) {
              extractedMedia = [newMsg.attachments.url];
            }
          }

          if ((!extractedMedia || extractedMedia.length === 0) && typeof newMsg.content === 'string') {
            const match = newMsg.content.match(/https?:\/\/[^\s]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif|\/profile-media\/[^\s]+|\/storage\/v1\/object\/public\/[^\s]+)/i);
            if (match) {
              extractedMedia = [match[0]];
            }
          }

          const isImg = (extractedMedia && extractedMedia.length > 0) || newMsg.message_type === 'image';
          const docMeta = newMsg.document_metadata || newMsg.attachments?.document_metadata || null;
          const inviteMeta = newMsg.workspace_invite_metadata || newMsg.attachments?.workspace_invite_metadata || null;
          const postMeta = newMsg.post_metadata || newMsg.attachments?.post_metadata || null;
          const profMeta = newMsg.profile_metadata || newMsg.attachments?.profile_metadata || null;
          const callMeta = newMsg.call_metadata || newMsg.attachments?.call_metadata || null;
          const audioMeta = newMsg.audio_metadata || newMsg.attachments?.audio_metadata || null;
          const doiMeta = newMsg.doi_metadata || newMsg.attachments?.doi_metadata || null;
          const pollData = newMsg.poll_data || newMsg.attachments?.poll_data || null;

          let detectedType = newMsg.message_type;
          if (isImg) detectedType = 'image';
          else if (docMeta) detectedType = 'document';
          else if (inviteMeta) detectedType = 'workspace_invite';
          else if (postMeta) detectedType = 'post';
          else if (profMeta) detectedType = 'profile';
          else if (callMeta) detectedType = 'call_log';
          else if (audioMeta) detectedType = 'audio';
          else if (doiMeta) detectedType = 'paper_doi';
          else if (pollData) detectedType = 'poll';
          else if (!detectedType) detectedType = 'text';

          const messageObj: WorkspaceMessage = {
            id: newMsg.id,
            workspace_id: newMsg.workspace_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            message_type: detectedType,
            doi_metadata: doiMeta,
            document_metadata: docMeta,
            workspace_invite_metadata: inviteMeta,
            post_metadata: postMeta,
            profile_metadata: profMeta,
            call_metadata: callMeta,
            audio_metadata: audioMeta,
            poll_data: pollData,
            attachments: newMsg.attachments || null,
            reactions: newMsg.reactions || null,
            is_edited: newMsg.is_edited || false,
            is_deleted: newMsg.is_deleted || false,
            e2ee_ciphertext: newMsg.e2ee_ciphertext || null,
            e2ee_nonce: newMsg.e2ee_nonce || null,
            media_urls: extractedMedia && extractedMedia.length > 0 ? extractedMedia : null,
            is_pinned: newMsg.is_pinned || false,
            reply_to_id: newMsg.reply_to_id || null,
            created_at: newMsg.created_at,
            updated_at: newMsg.updated_at || newMsg.created_at,
            sender: senderProfile,
          };

          if (payload.eventType === 'UPDATE') {
            set((state) => ({
              messages: state.messages.map((m) => (m.id === messageObj.id ? { ...m, ...messageObj } : m)),
            }));
            return;
          }

          // INSERT event
          set((state) => {
            if (state.messages.some((m) => m.id === messageObj.id)) {
              return {
                messages: state.messages.map((m) => (m.id === messageObj.id ? { ...m, ...messageObj } : m)),
              };
            }
            return {
              messages: [...state.messages, messageObj],
            };
          });

          // If current user is viewing this workspace, mark as read
          const currentUserId = useAuthStore.getState().user?.id;
          if (currentUserId && newMsg.sender_id !== currentUserId) {
            get().markAsRead(workspaceId);
          }
        }
      )
      // F. Postgres Changes for Workspace Members (Read Receipts)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload: any) => {
          const currentUserId = useAuthStore.getState().user?.id;
          if (payload.new && payload.new.user_id !== currentUserId && payload.new.last_read_at) {
            set((state) => ({
              otherLastReadMap: {
                ...state.otherLastReadMap,
                [workspaceId]: payload.new.last_read_at,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      activeWorkspaceChannels.delete(workspaceId);
      supabase.removeChannel(channel);
    };
  },

  subscribeToGlobalWorkspaceUpdates: (userId: string) => {
    const channel = supabase
      .channel(`user_global_workspaces:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
        },
        () => {
          get().loadWorkspaces(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_messages',
        },
        () => {
          get().loadWorkspaces(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspaces',
        },
        () => {
          get().loadWorkspaces(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
