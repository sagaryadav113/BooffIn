import { create } from 'zustand';
import { AppNotification } from '../types';
import { mockNotifications } from '../data/mockData';

interface NotificationState {
  notifications: AppNotification[];
  activeFilter: 'All' | 'Mentions' | 'Follows' | 'Updates';
  setActiveFilter: (filter: 'All' | 'Mentions' | 'Follows' | 'Updates') => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getFilteredNotifications: () => AppNotification[];
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,
  activeFilter: 'All',
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),
  getFilteredNotifications: () => {
    const { notifications, activeFilter } = get();
    if (activeFilter === 'All') return notifications;
    if (activeFilter === 'Mentions') {
      return notifications.filter((n) => n.type === 'comment' || n.type === 'mention');
    }
    if (activeFilter === 'Follows') {
      return notifications.filter((n) => n.type === 'follow');
    }
    if (activeFilter === 'Updates') {
      return notifications.filter(
        (n) => n.type === 'trending' || n.type === 'topic_update' || n.type === 'publisher_update'
      );
    }
    return notifications;
  },
  unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
}));
