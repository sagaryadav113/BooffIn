import { create } from 'zustand';
import { AppNotification, NotificationFilter } from '../types/notification';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead as apiMarkAsRead,
  markAllNotificationsAsRead as apiMarkAllAsRead,
  filterNotificationList,
} from '../api/notificationService';

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
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  activeFilter: 'All',
  isLoading: false,
  isRefreshing: false,
  error: null,

  loadNotifications: async (refresh = false) => {
    if (refresh) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }

    try {
      const { data, error } = await fetchNotifications(get().activeFilter);
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
    try {
      await fetchUnreadCount();
    } catch {
      // noop
    }
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter });
    get().loadNotifications();
  },

  markAsRead: async (id: string) => {
    // 1. Optimistic local update
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));

    // 2. Server sync
    try {
      await apiMarkAsRead(id);
    } catch {
      // Ignore background sync errors
    }
  },

  markAllAsRead: async () => {
    // 1. Optimistic local update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));

    // 2. Server sync
    try {
      await apiMarkAllAsRead();
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
}));
