import { create } from 'zustand';

interface PresenceState {
  onlineUserIds: Record<string, boolean>;
  setOnlineUsers: (users: Record<string, boolean>) => void;
  setUserOnline: (userId: string, isOnline: boolean) => void;
  isUserOnline: (userId?: string | null) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: {},
  setOnlineUsers: (users) => set({ onlineUserIds: users }),
  setUserOnline: (userId, isOnline) =>
    set((state) => {
      const updated = { ...state.onlineUserIds };
      if (isOnline) {
        updated[userId] = true;
      } else {
        delete updated[userId];
      }
      return { onlineUserIds: updated };
    }),
  isUserOnline: (userId) => {
    if (!userId) return false;
    return Boolean(get().onlineUserIds[userId]);
  },
}));
