import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceEvent,
  WorkspaceTask,
  WorkspaceTaskStatus,
  WorkspaceTaskPriority,
  WorkspaceTaskColor,
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
  WorkspacePollData,
} from '../types/workspace';
import { workspaceService } from '../api/workspaceService';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../api/client';
import { fetchUserProfile } from '../api/authService';
import { getBlockedUserIds } from '../api/moderationService';
import { useWorkspaceSettingsStore } from './useWorkspaceSettingsStore';

export type WorkspaceHubTab = 'all' | 'dms' | 'communities' | 'inner_circles';

interface WorkspaceState {
  // Lists
  dms: Workspace[];
  communities: Workspace[];
  innerCircles: Workspace[];
  discoverableCommunities: Workspace[];

  // Active Workspace Room State
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  messages: WorkspaceMessage[];
  messagesByRoom: Record<string, WorkspaceMessage[]>;
  hasMoreOlderMessages: Record<string, boolean>;
  isLoadingOlderMessages: boolean;
  unreadBelowCountByRoom: Record<string, number>;
  events: WorkspaceEvent[];
  tasks: WorkspaceTask[];
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
  setActiveWorkspaceId: (workspaceId: string | null) => void;
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
  loadOlderMessages: (workspaceId: string) => Promise<void>;
  incrementUnreadBelow: (workspaceId: string) => void;
  resetUnreadBelow: (workspaceId: string) => void;
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
    poll_data?: WorkspacePollData | null;
    call_metadata?: WorkspaceCallMetadata | null;
    reply_to_id?: string | null;
    reply_to_message?: {
      id: string;
      sender_name: string;
      content: string;
      message_type?: string;
    } | null;
    media_urls?: string[] | null;
    e2ee_ciphertext?: string | null;
    e2ee_nonce?: string | null;
  }) => Promise<{ success: boolean; message?: WorkspaceMessage | null; error: string | null }>;
  toggleReaction: (
    messageId: string,
    emoji: string
  ) => Promise<{ success: boolean; reactions: Record<string, string[]>; error: string | null }>;
  votePoll: (
    workspaceId: string,
    messageId: string,
    optionId: string
  ) => Promise<{ success: boolean; reactions: Record<string, string[]>; pollData?: WorkspacePollData; error: string | null }>;
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
  ) => Promise<{ success: boolean; message?: WorkspaceMessage | null; error: string | null }>;
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
    attendeeIds?: string[];
  }) => Promise<{ success: boolean; error: string | null }>;
  deleteEvent: (eventId: string, workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  loadTasks: (workspaceId: string) => Promise<void>;
  createTask: (params: {
    workspaceId: string;
    title: string;
    description?: string;
    status?: WorkspaceTaskStatus;
    priority?: WorkspaceTaskPriority;
    color?: WorkspaceTaskColor | null;
    dueDate?: string | null;
    dueTime?: string | null;
    assigneeId?: string | null;
    assignee?: any | null;
    tags?: string[];
    syncWithCalendar?: boolean;
    linkedEventId?: string | null;
  }) => Promise<{ success: boolean; task: WorkspaceTask | null; error: string | null }>;
  updateTask: (taskId: string, workspaceId: string, updates: Partial<WorkspaceTask>) => Promise<{ success: boolean; error: string | null }>;
  deleteTask: (taskId: string, workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  moveTaskStatus: (taskId: string, workspaceId: string, newStatus: WorkspaceTaskStatus) => Promise<{ success: boolean; error: string | null }>;
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
    itemType: 'message' | 'doi_paper' | 'opportunity' | 'event' | 'paper';
    itemId: string;
    title?: string;
    note?: string;
    metadata?: any;
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
    topics?: string[];
    research_fields?: string[];
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  createInnerCircle: (params: {
    name: string;
    description?: string;
    e2ee_enabled?: boolean;
    avatar_url?: string;
    member_ids?: string[];
  }) => Promise<{ workspace: Workspace | null; error: string | null }>;
  joinCommunity: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  disableCommunity: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
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
  deleteCommunityPermanently: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  leaveAndRemoveCommunity: (workspaceId: string) => Promise<{ success: boolean; error: string | null }>;
  refreshUnreadTotal: () => Promise<void>;
  resetWorkspaceSession: () => void;
  subscribeToWorkspaceMessages: (workspaceId: string) => () => void;
  subscribeToGlobalWorkspaceUpdates: (userId: string) => () => void;
}

const activeWorkspaceChannels = new Map<string, any>();
let currentMessagesRequestId = 0;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  dms: [],
  communities: [],
  innerCircles: [],
  discoverableCommunities: [],
  activeWorkspaceId: null,
  activeWorkspace: null,
  messages: [],
  messagesByRoom: {},
  hasMoreOlderMessages: {},
  isLoadingOlderMessages: false,
  unreadBelowCountByRoom: {},
  events: [],
  tasks: [],
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

  setActiveWorkspaceId: (workspaceId: string | null) => {
    set((state) => ({
      activeWorkspaceId: workspaceId,
      messages: workspaceId ? (state.messagesByRoom[workspaceId] || []) : [],
    }));
  },

  incrementUnreadBelow: (workspaceId: string) => {
    set((state) => ({
      unreadBelowCountByRoom: {
        ...state.unreadBelowCountByRoom,
        [workspaceId]: (state.unreadBelowCountByRoom[workspaceId] || 0) + 1,
      },
    }));
  },

  resetUnreadBelow: (workspaceId: string) => {
    set((state) => ({
      unreadBelowCountByRoom: {
        ...state.unreadBelowCountByRoom,
        [workspaceId]: 0,
      },
    }));
  },

  resetWorkspaceSession: () => {
    activeWorkspaceChannels.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    });
    activeWorkspaceChannels.clear();
    set({
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
      typingUsers: {},
      otherLastReadMap: {},
      error: null,
      isLoading: false,
      isRefreshing: false,
      isMessagesLoading: false,
      isMembersLoading: false,
      isSending: false,
    });
  },

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
    const reqId = ++currentMessagesRequestId;
    const existingRoomMsgs = get().messagesByRoom[workspaceId] || [];

    // Immediately isolate active workspace and display cached messages so previous chat never lingers or sticks!
    set({
      activeWorkspaceId: workspaceId,
      messages: existingRoomMsgs,
      isMessagesLoading: existingRoomMsgs.length === 0,
      error: null,
    });

    try {
      const currentUser = useAuthStore.getState().user;
      const res = await workspaceService.getMessages(workspaceId, 30, undefined, currentUser?.id);

      const deletedIdsInRoom = new Set(
        existingRoomMsgs
          .filter((m) => m.is_deleted === true || m.content === '🚫 This message was deleted')
          .map((m) => m.id)
      );

      const reconcileDeleted = (msgs: WorkspaceMessage[]): WorkspaceMessage[] =>
        msgs.map((m) => {
          if (deletedIdsInRoom.has(m.id)) {
            return {
              ...m,
              content: '🚫 This message was deleted',
              is_deleted: true,
              media_urls: null,
              attachments: null,
              doi_metadata: null,
              document_metadata: null,
              poll_data: null,
              audio_metadata: null,
              call_metadata: null,
              post_metadata: null,
              profile_metadata: null,
              workspace_invite_metadata: null,
              reactions: null,
              message_type: 'text' as const,
            };
          }
          return m;
        });

      // If another room was opened while this request was in flight, discard UI update for messages
      if (reqId !== currentMessagesRequestId || get().activeWorkspaceId !== workspaceId) {
        if (!res.error) {
          const blockedIds = await getBlockedUserIds();
          const filteredMessages = blockedIds.length > 0
            ? res.messages.filter((m) => !blockedIds.includes(m.sender_id))
            : res.messages;
          const reconciledMessages = reconcileDeleted(filteredMessages);
          set((state) => ({
            messagesByRoom: {
              ...state.messagesByRoom,
              [workspaceId]: reconciledMessages,
            },
            hasMoreOlderMessages: {
              ...state.hasMoreOlderMessages,
              [workspaceId]: res.messages.length >= 30,
            },
          }));
        }
        return;
      }

      if (res.error) {
        set({ isMessagesLoading: false, error: res.error });
      } else {
        const blockedIds = await getBlockedUserIds();
        const filteredMessages = blockedIds.length > 0
          ? res.messages.filter((m) => !blockedIds.includes(m.sender_id))
          : res.messages;
        const reconciledMessages = reconcileDeleted(filteredMessages);

        set((state) => ({
          messages: reconciledMessages,
          messagesByRoom: {
            ...state.messagesByRoom,
            [workspaceId]: reconciledMessages,
          },
          hasMoreOlderMessages: {
            ...state.hasMoreOlderMessages,
            [workspaceId]: res.messages.length >= 30,
          },
          isMessagesLoading: false,
        }));

        // Mark as read immediately
        if (currentUser) {
          get().markAsRead(workspaceId);
        }
      }
    } catch (err: any) {
      if (reqId === currentMessagesRequestId && get().activeWorkspaceId === workspaceId) {
        set({ isMessagesLoading: false, error: err.message });
      }
    }
  },

  loadOlderMessages: async (workspaceId: string) => {
    const state = get();
    if (state.isLoadingOlderMessages) return;
    const hasMore = state.hasMoreOlderMessages[workspaceId] ?? true;
    if (!hasMore) return;

    const roomMsgs = state.messagesByRoom[workspaceId] || (state.activeWorkspaceId === workspaceId ? state.messages : []);
    if (roomMsgs.length === 0) return;

    const oldestMsg = roomMsgs[0];
    const beforeCursor = oldestMsg.created_at;

    set({ isLoadingOlderMessages: true });
    try {
      const currentUser = useAuthStore.getState().user;
      const res = await workspaceService.getMessages(workspaceId, 30, beforeCursor, currentUser?.id);
      if (res.error) {
        set({ isLoadingOlderMessages: false });
        return;
      }

      const blockedIds = await getBlockedUserIds();
      const olderFiltered = blockedIds.length > 0
        ? res.messages.filter((m) => !blockedIds.includes(m.sender_id))
        : res.messages;

      const stillHasMore = res.messages.length >= 30;

      set((s) => {
        const existing = s.messagesByRoom[workspaceId] || (s.activeWorkspaceId === workspaceId ? s.messages : []);
        const existingIds = new Set(existing.map((m) => m.id));
        const uniqueOlder = olderFiltered.filter((m) => !existingIds.has(m.id));
        const merged = [...uniqueOlder, ...existing];
        const isCurrentRoom = s.activeWorkspaceId === workspaceId;

        return {
          messages: isCurrentRoom ? merged : s.messages,
          messagesByRoom: {
            ...s.messagesByRoom,
            [workspaceId]: merged,
          },
          hasMoreOlderMessages: {
            ...s.hasMoreOlderMessages,
            [workspaceId]: stillHasMore,
          },
          isLoadingOlderMessages: false,
        };
      });
    } catch {
      set({ isLoadingOlderMessages: false });
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
        const roomMessages = state.messagesByRoom[params.workspace_id] || (state.activeWorkspaceId === params.workspace_id ? state.messages : []);
        const exists = roomMessages.some((m) => m.id === res.message!.id);
        if (exists) return { isSending: false };
        const updatedRoom = [...roomMessages, res.message!];

        // Also update last_message in the workspace lists with the actual plaintext content
        const previewMsg = {
          ...res.message!,
          content: params.content !== '🔒 Encrypted message' ? params.content : (res.message!.content !== '🔒 Encrypted message' ? res.message!.content : 'Message'),
        };
        const updateWs = (w: Workspace) =>
          w.id === params.workspace_id ? { ...w, last_message: previewMsg, updated_at: previewMsg.created_at } : w;

        return {
          messages: state.activeWorkspaceId === params.workspace_id ? updatedRoom : state.messages,
          messagesByRoom: {
            ...state.messagesByRoom,
            [params.workspace_id]: updatedRoom,
          },
          dms: state.dms.map(updateWs),
          communities: state.communities.map(updateWs),
          innerCircles: state.innerCircles.map(updateWs),
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

      return { success: true, message: res.message, error: null };
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

  votePoll: async (workspaceId, messageId, optionId) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return { success: false, reactions: {}, error: 'Not authenticated' };

    let updatedReactions: Record<string, string[]> = {};
    let updatedPollData: WorkspacePollData | undefined = undefined;

    set((state) => {
      const msgs = state.messages.map((m) => {
        if (m.id === messageId) {
          const current = { ...(m.reactions || {}) };
          // Remove voter from all options
          Object.keys(current).forEach((k) => {
            if (k.startsWith('vote:') && Array.isArray(current[k])) {
              current[k] = current[k].filter((uid) => uid !== currentUser.id);
              if (current[k].length === 0) delete current[k];
            }
          });
          // Add new vote if optionId is provided
          if (optionId) {
            const voteKey = `vote:${optionId}`;
            const users = Array.isArray(current[voteKey]) ? [...current[voteKey]] : [];
            if (!users.includes(currentUser.id)) users.push(currentUser.id);
            current[voteKey] = users;
          }
          updatedReactions = current;

          let pd = m.poll_data || (m.attachments as any)?.poll_data || null;
          if (!pd && typeof m.content === 'string' && m.content.startsWith('📊 Poll:')) {
            const lines = m.content.split('\n');
            const q = lines[0].replace('📊 Poll:', '').trim();
            const optLines = lines.slice(1).filter((l) => l.startsWith('• '));
            const opts = optLines.map((l, idx) => ({
              id: `opt_${idx}`,
              text: l.replace('• ', '').trim(),
              votes: [] as string[],
            }));
            if (opts.length > 0) {
              pd = { question: q, options: opts, totalVotes: 0 };
            }
          }

          if (pd && Array.isArray(pd.options)) {
            const updatedOpts = pd.options.map((opt: any) => {
              let votes: string[] = Array.isArray(opt.votes) ? opt.votes.filter((uid: string) => uid !== currentUser.id) : [];
              if (opt.id === optionId) {
                votes.push(currentUser.id);
              }
              return { ...opt, votes };
            });
            let total = 0;
            updatedOpts.forEach((o: any) => { total += o.votes.length; });
            pd = { ...pd, options: updatedOpts, totalVotes: total };
            updatedPollData = pd;
          }

          return { ...m, reactions: current, poll_data: pd };
        }
        return m;
      });
      return { messages: msgs };
    });

    const channel = activeWorkspaceChannels.get(workspaceId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'message_updated',
        payload: {
          workspaceId,
          action: 'poll_vote',
          messageId,
          reactions: updatedReactions,
          poll_data: updatedPollData,
        },
      });
    }

    try {
      const res = await workspaceService.votePoll(workspaceId, messageId, optionId, currentUser.id);
      return res;
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
    const state = get();
    const currentUser = useAuthStore.getState().user;

    // Resolve targetWorkspaceId
    let targetWorkspaceId: string | null = state.activeWorkspaceId || null;
    const foundInActive = state.messages.find((m) => m.id === messageId);
    if (foundInActive) {
      targetWorkspaceId = foundInActive.workspace_id;
    } else {
      for (const [wId, msgs] of Object.entries(state.messagesByRoom)) {
        if (msgs.some((m) => m.id === messageId)) {
          targetWorkspaceId = wId;
          break;
        }
      }
      if (!targetWorkspaceId) {
        const allWs = [...state.dms, ...state.communities, ...state.innerCircles];
        const matchWs = allWs.find((w) => w.last_message?.id === messageId);
        if (matchWs) targetWorkspaceId = matchWs.id;
      }
    }

    // Clean local E2EE plaintext cache immediately
    AsyncStorage.removeItem(`e2ee_cache_${messageId}`).catch(() => {});

    // Optimistic update for both messages and messagesByRoom
    set((s) => {
      const isCurrentRoom = !targetWorkspaceId || s.activeWorkspaceId === targetWorkspaceId;

      const updateDeletedItem = (m: WorkspaceMessage): WorkspaceMessage => {
        if (m.id !== messageId) return m;
        return {
          ...m,
          content: '🚫 This message was deleted',
          is_deleted: true,
          media_urls: null,
          attachments: null,
          doi_metadata: null,
          document_metadata: null,
          poll_data: null,
          audio_metadata: null,
          call_metadata: null,
          post_metadata: null,
          profile_metadata: null,
          workspace_invite_metadata: null,
          reactions: null,
          message_type: 'text',
          e2ee_ciphertext: null,
          e2ee_nonce: null,
        };
      };

      const newMessages = deleteForEveryone
        ? s.messages.map(updateDeletedItem)
        : s.messages.filter((m) => m.id !== messageId);

      const updatedMessagesByRoom = { ...s.messagesByRoom };
      if (targetWorkspaceId && updatedMessagesByRoom[targetWorkspaceId]) {
        updatedMessagesByRoom[targetWorkspaceId] = deleteForEveryone
          ? updatedMessagesByRoom[targetWorkspaceId].map(updateDeletedItem)
          : updatedMessagesByRoom[targetWorkspaceId].filter((m) => m.id !== messageId);
      }

      // Also update last_message in workspace lists if this message was the last_message
      const updateLastMsg = (w: Workspace): Workspace => {
        if (!w.last_message || w.last_message.id !== messageId) return w;
        if (deleteForEveryone) {
          return {
            ...w,
            last_message: {
              ...w.last_message,
              content: '🚫 This message was deleted',
              is_deleted: true,
              media_urls: null,
              attachments: null,
              doi_metadata: null,
              document_metadata: null,
              poll_data: null,
              audio_metadata: null,
              call_metadata: null,
              post_metadata: null,
              profile_metadata: null,
              workspace_invite_metadata: null,
              reactions: null,
              message_type: 'text',
              e2ee_ciphertext: null,
              e2ee_nonce: null,
            },
          };
        } else {
          const remaining = (targetWorkspaceId && updatedMessagesByRoom[targetWorkspaceId]) || [];
          const prevMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;
          return {
            ...w,
            last_message: prevMsg,
          };
        }
      };

      return {
        messages: isCurrentRoom ? newMessages : s.messages,
        messagesByRoom: updatedMessagesByRoom,
        dms: s.dms.map(updateLastMsg),
        communities: s.communities.map(updateLastMsg),
        innerCircles: s.innerCircles.map(updateLastMsg),
      };
    });

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
      const res = await workspaceService.deleteMessage(messageId, deleteForEveryone, currentUser?.id);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  forwardMessage: async (targetWorkspaceId, message) => {
    try {
      const res = await workspaceService.forwardMessage(targetWorkspaceId, message);
      if (res.success && res.message) {
        if (get().activeWorkspace?.id === targetWorkspaceId) {
          set((state) => {
            const exists = state.messages.some((m) => m.id === res.message!.id);
            if (exists) return state;
            return { messages: [...state.messages, res.message!] };
          });
        }
        const channel = activeWorkspaceChannels.get(targetWorkspaceId);
        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: { message: res.message },
          });
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, message: null, error: err.message };
    }
  },

  markAsRead: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const now = new Date().toISOString();
    await workspaceService.markWorkspaceAsRead(workspaceId, currentUser.id);

    // Broadcast instant read receipt only if user enabled Send Read Receipts in settings
    const readReceiptsEnabled = useWorkspaceSettingsStore.getState().settings.readReceiptsEnabled;
    const channel = activeWorkspaceChannels.get(workspaceId);
    if (channel && readReceiptsEnabled) {
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

  deleteEvent: async (eventId: string, workspaceId: string) => {
    // 1. Optimistically filter from active state for instant response
    set((state) => ({
      events: (state.events || []).filter((e) => e.id !== eventId),
    }));

    const res = await workspaceService.deleteWorkspaceEvent(eventId, workspaceId);
    if (!res.success) {
      await get().loadEvents(workspaceId);
      return { success: false, error: res.error || 'Failed to delete event' };
    }
    await get().loadEvents(workspaceId);
    return { success: true, error: null };
  },

  loadTasks: async (workspaceId: string) => {
    const res = await workspaceService.getWorkspaceTasks(workspaceId);
    if (!res.error) {
      set({ tasks: res.tasks });
    }
  },

  createTask: async (params) => {
    const res = await workspaceService.createWorkspaceTask(params);
    if (res.error || !res.task) {
      return { success: false, task: null, error: res.error || 'Failed to create task' };
    }

    // Optimistically update tasks state
    set((state) => ({
      tasks: [res.task!, ...(state.tasks || []).filter((t) => t.id !== res.task!.id)],
    }));

    // If syncWithCalendar and dueDate is provided, schedule a linked calendar milestone
    if (params.syncWithCalendar && params.dueDate) {
      try {
        const startTime = `${params.dueDate}T${params.dueTime || '09:00'}:00.000Z`;
        const eventRes = await workspaceService.createWorkspaceEvent({
          workspaceId: params.workspaceId,
          title: `[Task] ${params.title}`,
          description: params.description || `Milestone for task: ${params.title}`,
          eventType: 'milestone',
          startTime,
        });

        if (eventRes.event) {
          // Link event to task
          await workspaceService.updateWorkspaceTask(res.task.id, params.workspaceId, {
            linked_event_id: eventRes.event.id,
          });
          set((state) => ({
            tasks: (state.tasks || []).map((t) =>
              t.id === res.task!.id ? { ...t, linked_event_id: eventRes.event!.id } : t
            ),
          }));
          await get().loadEvents(params.workspaceId);
        }
      } catch (calErr) {
        console.warn('[useWorkspaceStore] calendar sync note:', calErr);
      }
    }

    await get().loadTasks(params.workspaceId);
    return { success: true, task: res.task, error: null };
  },

  updateTask: async (taskId, workspaceId, updates) => {
    // Optimistic update
    set((state) => ({
      tasks: (state.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    }));

    const res = await workspaceService.updateWorkspaceTask(taskId, workspaceId, updates);
    if (!res.task && res.error) {
      await get().loadTasks(workspaceId);
      return { success: false, error: res.error };
    }

    // If task was marked 'done' and has a linked calendar event, update event title to completed
    if (updates.status === 'done') {
      const existing = (get().tasks || []).find((t) => t.id === taskId);
      if (existing?.linked_event_id) {
        try {
          const linkedEv = (get().events || []).find((e) => e.id === existing.linked_event_id);
          if (linkedEv && !linkedEv.title.startsWith('✅')) {
            // Optimistically update event title with checkmark
            set((state) => ({
              events: (state.events || []).map((e) =>
                e.id === existing.linked_event_id ? { ...e, title: `✅ ${e.title}` } : e
              ),
            }));
          }
        } catch {}
      }
    }

    return { success: true, error: null };
  },

  deleteTask: async (taskId, workspaceId) => {
    const task = (get().tasks || []).find((t) => t.id === taskId);
    set((state) => ({
      tasks: (state.tasks || []).filter((t) => t.id !== taskId),
    }));

    if (task?.linked_event_id) {
      try {
        await get().deleteEvent(task.linked_event_id, workspaceId);
      } catch {}
    }

    const res = await workspaceService.deleteWorkspaceTask(taskId, workspaceId);
    return { success: res.success, error: res.error };
  },

  moveTaskStatus: async (taskId, workspaceId, newStatus) => {
    return get().updateTask(taskId, workspaceId, { status: newStatus });
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
    const userId = currentUser?.id;
    if (!userId) return;
    const res = await workspaceService.getWorkspaceSavedItems(workspaceId, userId);
    if (!res.error && res.savedItems) {
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
        savedItems: state.savedItems.filter((i) => i.item_id !== itemId && i.id !== itemId),
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

  disableCommunity: async (workspaceId: string) => {
    const res = await workspaceService.disableCommunity(workspaceId);
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

    // Clear local messages and reset previews immediately
    set((state) => ({
      messages: state.activeWorkspaceId === workspaceId ? [] : state.messages,
      messagesByRoom: { ...state.messagesByRoom, [workspaceId]: [] },
      dms: state.dms.map((d) => (d.id === workspaceId ? { ...d, last_message: null, unread_count: 0 } : d)),
      communities: state.communities.map((c) => (c.id === workspaceId ? { ...c, last_message: null, unread_count: 0 } : c)),
      innerCircles: state.innerCircles.map((i) => (i.id === workspaceId ? { ...i, last_message: null, unread_count: 0 } : i)),
    }));

    return await workspaceService.clearChatHistory(currentUser.id, workspaceId);
  },

  deleteWorkspaceLocally: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser?.id) return { success: false, error: 'Not authenticated' };

    // Remove from local list immediately
    set((state) => {
      const updatedMessagesByRoom = { ...state.messagesByRoom };
      delete updatedMessagesByRoom[workspaceId];
      return {
        dms: state.dms.filter((d) => d.id !== workspaceId),
        communities: state.communities.filter((c) => c.id !== workspaceId),
        innerCircles: state.innerCircles.filter((i) => i.id !== workspaceId),
        discoverableCommunities: state.discoverableCommunities.filter((w) => w.id !== workspaceId),
        activeWorkspace: state.activeWorkspace?.id === workspaceId ? null : state.activeWorkspace,
        messages: state.activeWorkspaceId === workspaceId ? [] : state.messages,
        messagesByRoom: updatedMessagesByRoom,
      };
    });

    return await workspaceService.deleteWorkspaceLocally(currentUser.id, workspaceId);
  },

  deleteCommunityPermanently: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser?.id) {
      await workspaceService.deleteWorkspaceLocally(currentUser.id, workspaceId);
    }
    const res = await workspaceService.deleteCommunityPermanently(workspaceId);
    set((state) => ({
      communities: state.communities.filter((c) => c.id !== workspaceId),
      innerCircles: state.innerCircles.filter((i) => i.id !== workspaceId),
      discoverableCommunities: state.discoverableCommunities.filter((w) => w.id !== workspaceId),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? null : state.activeWorkspace,
      messages: state.activeWorkspace?.id === workspaceId ? [] : state.messages,
    }));
    await get().loadWorkspaces(true);
    return res;
  },

  leaveAndRemoveCommunity: async (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    const res = await workspaceService.leaveWorkspace(workspaceId);
    if (currentUser?.id) {
      await workspaceService.deleteWorkspaceLocally(currentUser.id, workspaceId);
    }
    set((state) => ({
      communities: state.communities.filter((c) => c.id !== workspaceId),
      innerCircles: state.innerCircles.filter((i) => i.id !== workspaceId),
      discoverableCommunities: state.discoverableCommunities.filter((w) => w.id !== workspaceId),
      activeWorkspace: state.activeWorkspace?.id === workspaceId ? null : state.activeWorkspace,
      messages: state.activeWorkspace?.id === workspaceId ? [] : state.messages,
    }));
    await get().loadWorkspaces(true);
    return res;
  },

  refreshUnreadTotal: async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    const count = await workspaceService.getUnreadCount(currentUser.id);
    set({ unreadTotal: count });
  },

  subscribeToWorkspaceMessages: (workspaceId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !workspaceId) {
      return () => {};
    }

    // 1. Clean up any existing channel for this workspace first to prevent callback-after-subscribe errors
    const existing = activeWorkspaceChannels.get(workspaceId);
    if (existing) {
      try {
        supabase.removeChannel(existing);
      } catch {}
      activeWorkspaceChannels.delete(workspaceId);
    }

    const channelName = `workspace_room:${workspaceId}`;
    try {
      const existingInClient = supabase.getChannels().find((c: any) => c.topic === `realtime:${channelName}` || c.topic === channelName);
      if (existingInClient) {
        supabase.removeChannel(existingInClient);
      }
    } catch {}

    // 2. Establish dedicated real-time room channel with broadcast support
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    activeWorkspaceChannels.set(workspaceId, channel);

    channel
      // A. Realtime Instant Broadcast: New Message (0ms latency)
      .on('broadcast', { event: 'new_message' }, async ({ payload }: any) => {
        if (!payload?.message || payload.message.workspace_id !== workspaceId) return;
        const msg = payload.message as WorkspaceMessage;

        // Privacy Hardening: Suppress realtime messages from blocked users
        try {
          if (msg.sender_id) {
            const blockedIds = await getBlockedUserIds();
            if (blockedIds.includes(msg.sender_id)) return;
          }
        } catch {}

        set((state) => {
          const roomMsgs = state.messagesByRoom[workspaceId] || (state.activeWorkspaceId === workspaceId ? state.messages : []);
          const exists = roomMsgs.some((m) => m.id === msg.id);
          const updatedRoom = exists
            ? roomMsgs.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
            : [...roomMsgs, msg];
          const isCurrentRoom = state.activeWorkspaceId === workspaceId;

          const updateWs = (w: Workspace) =>
            w.id === workspaceId ? { ...w, last_message: msg, updated_at: msg.created_at } : w;

          return {
            messages: isCurrentRoom ? updatedRoom : state.messages,
            messagesByRoom: {
              ...state.messagesByRoom,
              [workspaceId]: updatedRoom,
            },
            dms: state.dms.map(updateWs),
            communities: state.communities.map(updateWs),
            innerCircles: state.innerCircles.map(updateWs),
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
          AsyncStorage.removeItem(`e2ee_cache_${payload.messageId}`).catch(() => {});
          set((state) => {
            const isCurrentRoom = state.activeWorkspaceId === workspaceId;
            const updateItem = (m: WorkspaceMessage) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    content: '🚫 This message was deleted',
                    is_deleted: true,
                    media_urls: null,
                    doi_metadata: null,
                    attachments: null,
                    document_metadata: null,
                    poll_data: null,
                    audio_metadata: null,
                    call_metadata: null,
                    post_metadata: null,
                    profile_metadata: null,
                    workspace_invite_metadata: null,
                    reactions: null,
                    message_type: 'text' as const,
                    e2ee_ciphertext: null,
                    e2ee_nonce: null,
                  }
                : m;
            const updatedMsgs = payload.deleteForEveryone
              ? state.messages.map(updateItem)
              : state.messages.filter((m) => m.id !== payload.messageId);

            const room = state.messagesByRoom[workspaceId];
            const updatedRoom = room
              ? (payload.deleteForEveryone ? room.map(updateItem) : room.filter((m) => m.id !== payload.messageId))
              : undefined;

            const updateWsLastMsg = (w: Workspace): Workspace => {
              if (w.id !== workspaceId || !w.last_message || w.last_message.id !== payload.messageId) return w;
              if (payload.deleteForEveryone) {
                return {
                  ...w,
                  last_message: {
                    ...w.last_message,
                    content: '🚫 This message was deleted',
                    is_deleted: true,
                    media_urls: null,
                    attachments: null,
                    doi_metadata: null,
                    document_metadata: null,
                    poll_data: null,
                    audio_metadata: null,
                    call_metadata: null,
                    post_metadata: null,
                    profile_metadata: null,
                    workspace_invite_metadata: null,
                    reactions: null,
                    message_type: 'text',
                    e2ee_ciphertext: null,
                    e2ee_nonce: null,
                  },
                };
              } else {
                const remaining = updatedRoom || [];
                const prevMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;
                return {
                  ...w,
                  last_message: prevMsg,
                };
              }
            };

            return {
              messages: isCurrentRoom ? updatedMsgs : state.messages,
              messagesByRoom: updatedRoom
                ? { ...state.messagesByRoom, [workspaceId]: updatedRoom }
                : state.messagesByRoom,
              dms: state.dms.map(updateWsLastMsg),
              communities: state.communities.map(updateWsLastMsg),
              innerCircles: state.innerCircles.map(updateWsLastMsg),
            };
          });
        } else if (payload.action === 'edit') {
          set((state) => {
            const isCurrentRoom = state.activeWorkspaceId === workspaceId;
            const updateItem = (m: WorkspaceMessage) =>
              m.id === payload.messageId
                ? { ...m, content: payload.newContent, is_edited: true, updated_at: new Date().toISOString() }
                : m;

            const updatedMsgs = state.messages.map(updateItem);
            const room = state.messagesByRoom[workspaceId];
            const updatedRoom = room ? room.map(updateItem) : undefined;

            return {
              messages: isCurrentRoom ? updatedMsgs : state.messages,
              messagesByRoom: updatedRoom
                ? { ...state.messagesByRoom, [workspaceId]: updatedRoom }
                : state.messagesByRoom,
            };
          });
        } else if (payload.action === 'reaction' || payload.action === 'poll_vote') {
          set((state) => {
            const isCurrentRoom = state.activeWorkspaceId === workspaceId;
            const updateItem = (m: WorkspaceMessage) =>
              m.id === payload.messageId
                ? {
                    ...m,
                    reactions: payload.reactions ?? m.reactions,
                    poll_data: payload.poll_data ?? m.poll_data,
                  }
                : m;

            const updatedMsgs = state.messages.map(updateItem);
            const room = state.messagesByRoom[workspaceId];
            const updatedRoom = room ? room.map(updateItem) : undefined;

            return {
              messages: isCurrentRoom ? updatedMsgs : state.messages,
              messagesByRoom: updatedRoom
                ? { ...state.messagesByRoom, [workspaceId]: updatedRoom }
                : state.messagesByRoom,
            };
          });
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
              set((state) => {
                const isCurrentRoom = state.activeWorkspaceId === workspaceId;
                const room = state.messagesByRoom[workspaceId];
                return {
                  messages: isCurrentRoom ? state.messages.filter((m) => m.id !== oldId) : state.messages,
                  messagesByRoom: room
                    ? { ...state.messagesByRoom, [workspaceId]: room.filter((m) => m.id !== oldId) }
                    : state.messagesByRoom,
                };
              });
            }
            return;
          }

          const newMsg = payload.new;
          if (!newMsg || !newMsg.id) return;

          // Privacy Hardening: Suppress incoming database messages from blocked users
          try {
            if (newMsg.sender_id) {
              const blockedIds = await getBlockedUserIds();
              if (blockedIds.includes(newMsg.sender_id)) return;
            }
          } catch {}

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
          let pollData = newMsg.poll_data || newMsg.attachments?.poll_data || null;

          // Reconstruct pollData from content if it was not explicitly in attachments
          if (!pollData && typeof newMsg.content === 'string' && (newMsg.content.startsWith('📊 Poll:') || newMsg.content.includes('Poll:'))) {
            const lines = newMsg.content.split('\n');
            const q = lines[0].replace('📊 Poll:', '').replace(/^[^\w]*/, '').trim();
            const optLines = lines.slice(1).filter((l: string) => l.startsWith('• ') || l.startsWith('- '));
            const parsedOptions = optLines.map((l: string, idx: number) => ({
              id: `opt_${idx}`,
              text: l.replace(/^[•\-\d\.]+\s*/, '').trim(),
              votes: [] as string[],
            }));
            if (parsedOptions.length > 0) {
              pollData = {
                question: q,
                options: parsedOptions,
                totalVotes: 0,
              };
            }
          }

          let detectedType = newMsg.message_type;
          if (isImg) detectedType = 'image';
          else if (docMeta) detectedType = 'document';
          else if (inviteMeta) detectedType = 'workspace_invite';
          else if (postMeta) detectedType = 'post';
          else if (profMeta) detectedType = 'profile';
          else if (callMeta) detectedType = 'call_log';
          else if (audioMeta) detectedType = 'audio';
          else if (doiMeta) detectedType = 'paper_doi';
          else if (pollData || (typeof newMsg.content === 'string' && newMsg.content.startsWith('📊 Poll:'))) detectedType = 'poll';
          else if (!detectedType) detectedType = 'text';

          // Extract reactions properly from either reactions column or attachments.reactions
          let extractedReactions: Record<string, string[]> | null = null;
          if (newMsg.reactions && typeof newMsg.reactions === 'object' && !Array.isArray(newMsg.reactions)) {
            extractedReactions = newMsg.reactions;
          } else if (newMsg.attachments?.reactions && typeof newMsg.attachments.reactions === 'object' && !Array.isArray(newMsg.attachments.reactions)) {
            extractedReactions = newMsg.attachments.reactions;
          }

          const isIncomingMsgDeleted = Boolean(
            newMsg.is_deleted === true ||
            newMsg.content === '🚫 This message was deleted'
          );

          const messageObj: WorkspaceMessage = {
            id: newMsg.id,
            workspace_id: newMsg.workspace_id,
            sender_id: newMsg.sender_id,
            content: isIncomingMsgDeleted ? '🚫 This message was deleted' : newMsg.content,
            message_type: isIncomingMsgDeleted ? 'text' : detectedType,
            doi_metadata: isIncomingMsgDeleted ? null : doiMeta,
            document_metadata: isIncomingMsgDeleted ? null : docMeta,
            workspace_invite_metadata: isIncomingMsgDeleted ? null : inviteMeta,
            post_metadata: isIncomingMsgDeleted ? null : postMeta,
            profile_metadata: isIncomingMsgDeleted ? null : profMeta,
            call_metadata: isIncomingMsgDeleted ? null : callMeta,
            audio_metadata: isIncomingMsgDeleted ? null : audioMeta,
            poll_data: isIncomingMsgDeleted ? null : pollData,
            attachments: isIncomingMsgDeleted ? null : (newMsg.attachments || null),
            reactions: isIncomingMsgDeleted ? null : extractedReactions,
            is_edited: isIncomingMsgDeleted ? false : (newMsg.is_edited || false),
            is_deleted: isIncomingMsgDeleted ? true : false,
            e2ee_ciphertext: isIncomingMsgDeleted ? null : (newMsg.e2ee_ciphertext || null),
            e2ee_nonce: isIncomingMsgDeleted ? null : (newMsg.e2ee_nonce || null),
            media_urls: isIncomingMsgDeleted ? null : (extractedMedia && extractedMedia.length > 0 ? extractedMedia : null),
            is_pinned: isIncomingMsgDeleted ? false : (newMsg.is_pinned || false),
            is_forwarded: isIncomingMsgDeleted ? false : (newMsg.is_forwarded ?? (newMsg.attachments?.is_forwarded || false)),
            reply_to_id: isIncomingMsgDeleted ? null : (newMsg.reply_to_id || newMsg.attachments?.reply_to_id || null),
            reply_to_message:
              newMsg.reply_to_message ||
              newMsg.attachments?.reply_to_message ||
              (() => {
                const pId = newMsg.reply_to_id || newMsg.attachments?.reply_to_id;
                if (!pId) return null;
                const parent = get().messages.find((m) => m.id === pId);
                if (!parent) return null;
                return {
                  id: parent.id,
                  sender_name: parent.sender?.fullName || parent.sender?.handle || 'Researcher',
                  content: parent.content || (parent.doi_metadata ? 'Shared a research paper' : 'Attachment'),
                  message_type: parent.message_type,
                };
              })(),
            created_at: newMsg.created_at,
            updated_at: newMsg.updated_at || newMsg.created_at,
            sender: senderProfile,
          };

          if (payload.eventType === 'UPDATE') {
            set((state) => {
              const isCurrentRoom = state.activeWorkspaceId === workspaceId;
              const room = state.messagesByRoom[workspaceId];
              const mergeUpdate = (m: WorkspaceMessage): WorkspaceMessage => {
                if (m.id !== messageObj.id) return m;
                // Preserve reactions and poll_data if incoming update does not contain them
                const mergedReactions = messageObj.reactions || m.reactions || null;
                let mergedPollData = messageObj.poll_data || m.poll_data || null;

                // Reconcile poll options with vote keys from mergedReactions so votes never vanish
                if (mergedPollData && Array.isArray(mergedPollData.options) && mergedReactions) {
                  mergedPollData = {
                    ...mergedPollData,
                    options: mergedPollData.options.map((opt: any) => {
                      const voteKey = `vote:${opt.id}`;
                      const voterSet = new Set<string>(Array.isArray(opt.votes) ? opt.votes : []);
                      if (Array.isArray(mergedReactions[voteKey])) {
                        mergedReactions[voteKey].forEach((uid: string) => voterSet.add(uid));
                      }
                      return { ...opt, votes: Array.from(voterSet) };
                    }),
                  };
                  let tot = 0;
                  mergedPollData.options.forEach((o: any) => {
                    tot += (o.votes?.length || 0);
                  });
                  mergedPollData.totalVotes = tot;
                }

                return {
                  ...m,
                  ...messageObj,
                  reactions: mergedReactions,
                  poll_data: mergedPollData,
                  sender: messageObj.sender || m.sender,
                };
              };

              return {
                messages: isCurrentRoom ? state.messages.map(mergeUpdate) : state.messages,
                messagesByRoom: room
                  ? {
                      ...state.messagesByRoom,
                      [workspaceId]: room.map(mergeUpdate),
                    }
                  : state.messagesByRoom,
              };
            });
            return;
          }

          // Check if this is a poll vote action transaction
          const isVoteAction =
            newMsg.attachments?.is_poll_vote_action === true ||
            (typeof newMsg.content === 'string' && (newMsg.content.includes('Vote:') || newMsg.content.includes('[POLL_VOTE]')));

          if (isVoteAction) {
            let pollId = newMsg.attachments?.poll_id;
            let optionId = newMsg.attachments?.option_id;
            const voterId = newMsg.attachments?.voter_id || newMsg.sender_id;

            if (!pollId && typeof newMsg.content === 'string') {
              const matchPoll = newMsg.content.match(/\[([a-f0-9\-]+)\]/i);
              if (matchPoll) pollId = matchPoll[1];
            }
            if (optionId === undefined && typeof newMsg.content === 'string') {
              const matchOpt = newMsg.content.match(/Vote:\s*([^\s\[]+)/i);
              if (matchOpt && matchOpt[1] !== 'retracted') {
                optionId = matchOpt[1];
              } else {
                optionId = '';
              }
            }

            if (pollId && voterId) {
              set((state) => {
                const updatePoll = (m: WorkspaceMessage) => {
                  if (m.id === pollId) {
                    const currentReactions = { ...(m.reactions || {}) };
                    Object.keys(currentReactions).forEach((k) => {
                      if (k.startsWith('vote:') && Array.isArray(currentReactions[k])) {
                        currentReactions[k] = currentReactions[k].filter((uid) => uid !== voterId);
                        if (currentReactions[k].length === 0) delete currentReactions[k];
                      }
                    });
                    if (optionId) {
                      const voteKey = `vote:${optionId}`;
                      const users = Array.isArray(currentReactions[voteKey]) ? [...currentReactions[voteKey]] : [];
                      if (!users.includes(voterId)) users.push(voterId);
                      currentReactions[voteKey] = users;
                    }

                    let pd = m.poll_data ? { ...m.poll_data } : null;
                    if (!pd && typeof m.content === 'string' && (m.content.startsWith('📊 Poll:') || m.content.includes('Poll:'))) {
                      const lines = m.content.split('\n');
                      const q = lines[0].replace('📊 Poll:', '').trim();
                      const optLines = lines.slice(1).filter((l) => l.startsWith('• ') || l.startsWith('- '));
                      const opts = optLines.map((l, idx) => ({
                        id: `opt_${idx}`,
                        text: l.replace(/^[•\-\d\.]+\s*/, '').trim(),
                        votes: [] as string[],
                      }));
                      if (opts.length > 0) {
                        pd = { question: q, options: opts, totalVotes: 0 };
                      }
                    }

                    if (pd && Array.isArray(pd.options)) {
                      const updatedOpts = pd.options.map((opt) => {
                        let votes: string[] = Array.isArray(opt.votes) ? opt.votes.filter((uid) => uid !== voterId) : [];
                        const isMatch = opt.id === optionId || `opt_${opt.id}` === optionId || opt.id === `opt_${optionId}`;
                        if (isMatch) {
                          votes.push(voterId);
                        }
                        return { ...opt, votes };
                      });
                      let total = 0;
                      updatedOpts.forEach((o) => { total += o.votes.length; });
                      pd = { ...pd, options: updatedOpts, totalVotes: total };
                    }

                    return { ...m, reactions: currentReactions, poll_data: pd };
                  }
                  return m;
                };

                const isCurrentRoom = state.activeWorkspaceId === workspaceId;
                const room = state.messagesByRoom[workspaceId];
                return {
                  messages: isCurrentRoom ? state.messages.map(updatePoll) : state.messages,
                  messagesByRoom: room
                    ? { ...state.messagesByRoom, [workspaceId]: room.map(updatePoll) }
                    : state.messagesByRoom,
                };
              });
            }
            return;
          }

          // INSERT event
          set((state) => {
            const roomMsgs = state.messagesByRoom[workspaceId] || (state.activeWorkspaceId === workspaceId ? state.messages : []);
            const exists = roomMsgs.some((m) => m.id === messageObj.id);
            const updatedRoom = exists
              ? roomMsgs.map((m) => (m.id === messageObj.id ? { ...m, ...messageObj } : m))
              : [...roomMsgs, messageObj];
            const isCurrentRoom = state.activeWorkspaceId === workspaceId;

            return {
              messages: isCurrentRoom ? updatedRoom : state.messages,
              messagesByRoom: {
                ...state.messagesByRoom,
                [workspaceId]: updatedRoom,
              },
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
