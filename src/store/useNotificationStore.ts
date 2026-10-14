import { create } from 'zustand';
import * as Haptics from 'expo-haptics';
import { AppNotification, NotificationFilter } from '../types/notification';
import {
  fetchNotifications,
  fetchNotificationById,
  fetchUnreadCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  filterNotificationList,
  deduplicateNotificationList,
} from '../api/notificationService';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../api/client';

interface NotificationState {
  notifications: AppNotification[];
  activeFilter: NotificationFilter;
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;

  // Actions
  loadNotifications: (refresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  setActiveFilter: (filter: NotificationFilter) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  getFilteredNotifications: () => AppNotification[];
  subscribeToRealtimeNotifications: (userId?: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  activeFilter: 'All',
  unreadCount: 0,
  isLoading: false,
  isRefreshing: false,
  isLoadingMore: false,
  hasMore: true,
  page: 1,
  error: null,

  loadNotifications: async (refresh = false) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (refresh) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const { data, hasMore, error } = await fetchNotifications(get().activeFilter, 1, 40, currentUserId);
      if (error) {
        set({ error, isLoading: false, isRefreshing: false });
      } else {
        const { uniqueNotifications } = deduplicateNotificationList(data);
        const unread = uniqueNotifications.filter((n) => !n.isRead).length;
        set({
          notifications: uniqueNotifications,
          unreadCount: unread,
          page: 1,
          hasMore,
          isLoading: false,
          isRefreshing: false,
        });
      }
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load notifications',
        isLoading: false,
        isRefreshing: false,
      });
    }
  },

  loadMore: async () => {
    const { isLoading, isLoadingMore, hasMore, page, notifications, activeFilter } = get();
    if (isLoading || isLoadingMore || !hasMore) return;

    const currentUserId = useAuthStore.getState().user?.id;
    const nextPage = page + 1;
    set({ isLoadingMore: true });

    try {
      const { data, hasMore: nextHasMore, error } = await fetchNotifications(activeFilter, nextPage, 40, currentUserId);
      if (error) {
        set({ isLoadingMore: false });
        return;
      }

      const combined = [...notifications, ...data];
      const { uniqueNotifications } = deduplicateNotificationList(combined);
      const unread = uniqueNotifications.filter((n) => !n.isRead).length;

      set({
        notifications: uniqueNotifications,
        unreadCount: unread,
        page: nextPage,
        hasMore: nextHasMore,
        isLoadingMore: false,
      });
    } catch {
      set({ isLoadingMore: false });
    }
  },

  loadUnreadCount: async () => {
    const currentUserId = useAuthStore.getState().user?.id;
    try {
      const { count } = await fetchUnreadCount(currentUserId);
      set({ unreadCount: count });
    } catch {
      // noop
    }
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter, page: 1, hasMore: true });
    get().loadNotifications();
  },

  markAsRead: async (id: string) => {
    const currentUserId = useAuthStore.getState().user?.id;
    // 1. Optimistic local update
    set((state) => {
      const updated = state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.isRead).length,
      };
    });

    // 2. Server sync
    try {
      await apiMarkAsRead(id, currentUserId);
    } catch {
      // Ignore background sync errors
    }
  },

  markAllAsRead: async () => {
    const currentUserId = useAuthStore.getState().user?.id;
    // 1. Optimistic local update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    // 2. Server sync
    try {
      await apiMarkAllAsRead(currentUserId);
    } catch {
      // Ignore background sync errors
    }
  },

  getFilteredNotifications: () => {
    const { notifications, activeFilter } = get();
    return filterNotificationList(notifications, activeFilter);
  },

  subscribeToRealtimeNotifications: (userId?: string) => {
    const targetUserId = userId || useAuthStore.getState().user?.id;
    if (!targetUserId || targetUserId === 'unknown') {
      return () => {};
    }

    const channel = supabase
      .channel(`notifications-stream-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${targetUserId}`,
        },
        async (payload: any) => {
          const eventType = payload.eventType;

          if (eventType === 'INSERT' && payload.new?.id) {
            // 1. Optimistically bump unread count immediately
            set((state) => ({ unreadCount: state.unreadCount + 1 }));

            // 2. Subtle haptic notification if supported
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}

            // 3. Fetch enriched notification record with actor profile
            const fullNotification = await fetchNotificationById(payload.new.id);
            if (fullNotification) {
              set((state) => {
                const alreadyExists = state.notifications.some((n) => n.id === fullNotification.id);
                if (alreadyExists) return state;
                const updatedList = [fullNotification, ...state.notifications];
                const { uniqueNotifications } = deduplicateNotificationList(updatedList);
                return {
                  notifications: uniqueNotifications,
                  unreadCount: uniqueNotifications.filter((n) => !n.isRead).length,
                };
              });
            }
          } else if (eventType === 'UPDATE' && payload.new?.id) {
            set((state) => {
              const updated = state.notifications.map((n) =>
                n.id === payload.new.id ? { ...n, isRead: Boolean(payload.new.read_status) } : n
              );
              return {
                notifications: updated,
                unreadCount: updated.filter((n) => !n.isRead).length,
              };
            });
          } else if (eventType === 'DELETE' && payload.old?.id) {
            set((state) => {
              const remaining = state.notifications.filter((n) => n.id !== payload.old.id);
              return {
                notifications: remaining,
                unreadCount: remaining.filter((n) => !n.isRead).length,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));


