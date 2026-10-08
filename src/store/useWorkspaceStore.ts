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
  isLoading: boolean;
  isRefreshing: boolean;
  isMessagesLoading: boolean;
  isMembersLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  setActiveHubTab: (tab: WorkspaceHubTab) => void;
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
  leaveWorkspace: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  loadMessages: (workspaceId: string) => Promise<void>;
  sendMessage: (params: {
    workspace_id: string;
    content: string;
    message_type?: WorkspaceMessageType;
    doi_metadata?: DoiMetadata | null;
    reply_to_id?: string | null;
    media_urls?: string[] | null;
    e2ee_ciphertext?: string | null;
    e2ee_nonce?: string | null;
  }) => Promise<{ success: boolean; error: string | null }>;
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
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  createInnerCircle: (params: {
    name: string;
    description?: string;
    e2ee_enabled?: boolean;
    avatar_url?: string;
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  joinCommunity: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  refreshUnreadTotal: () => Promise<void>;
  subscribeToWorkspaceMessages: (workspaceId: string) => () => void;
  subscribeToGlobalWorkspaceUpdates: (userId: string) => () => void;
}

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
  isLoading: false,
  isRefreshing: false,
  isMessagesLoading: false,
  isMembersLoading: false,
  isSending: false,
  error: null,

  setActiveHubTab: (tab: WorkspaceHubTab) => set({ activeHubTab: tab }),

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

      return { success: true, error: null };
    } catch (err: any) {
      set({ isSending: false });
      return { success: false, error: err.message || 'Failed to send' };
    }
  },

  markAsRead: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    await workspaceService.markWorkspaceAsRead(workspaceId, currentUser.id);

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

  refreshUnreadTotal: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const count = await workspaceService.getUnreadCount(currentUser.id);
    set({ unreadTotal: count });
  },

  subscribeToWorkspaceMessages: (workspaceId: string) => {
    const channel = supabase
      .channel(`workspace_messages:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new;
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

          const messageObj: WorkspaceMessage = {
            id: newMsg.id,
            workspace_id: newMsg.workspace_id,
            sender_id: newMsg.sender_id,
            content: newMsg.content,
            message_type: newMsg.message_type,
            doi_metadata: newMsg.doi_metadata,
            e2ee_ciphertext: newMsg.e2ee_ciphertext,
            e2ee_nonce: newMsg.e2ee_nonce,
            media_urls: newMsg.media_urls,
            is_pinned: newMsg.is_pinned,
            reply_to_id: newMsg.reply_to_id,
            created_at: newMsg.created_at,
            updated_at: newMsg.updated_at,
            sender: senderProfile,
          };

          set((state) => {
            if (state.messages.some((m) => m.id === messageObj.id)) {
              return state;
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToGlobalWorkspaceUpdates: (userId: string) => {
    const channel = supabase
      .channel(`user_workspaces:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `user_id=eq.${userId}`,
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
