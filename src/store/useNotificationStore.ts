import { create } from 'zustand';
import { AppNotification, NotificationFilter } from '../types/notification';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  filterNotificationList,
} from '../api/notificationService';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../api/client';

interface NotificationState {
  notifications: AppNotification[];
  activeFilter: NotificationFilter;
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  loadNotifications: (refresh?: boolean) => Promise<void>;
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
  error: null,

  loadNotifications: async (refresh = false) => {
    const currentUserId = useAuthStore.getState().user?.id;
    if (refresh) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const { data, error } = await fetchNotifications(get().activeFilter, 1, 30, currentUserId);
      if (error) {
        set({ error, isLoading: false, isRefreshing: false });
      } else {
        const unread = data.filter((n) => !n.isRead).length;
        set({ notifications: data, unreadCount: unread, isLoading: false, isRefreshing: false });
      }
    } catch (err: any) {
      set({
        error: err.message || 'Failed to load notifications',
        isLoading: false,
        isRefreshing: false,
      });
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
    set({ activeFilter: filter });
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
        () => {
          get().loadNotifications(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));


