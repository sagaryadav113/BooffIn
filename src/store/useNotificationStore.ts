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
  unreadCount: () => number;
  subscribeToRealtimeNotifications: (userId?: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  activeFilter: 'All',
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
        set({ notifications: data, isLoading: false, isRefreshing: false });
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
      await fetchUnreadCount(currentUserId);
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
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));

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

  unreadCount: () => {
    return get().notifications.filter((n) => !n.isRead).length;
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

