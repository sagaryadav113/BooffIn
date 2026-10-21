import { create } from 'zustand';
import { UserSettings, defaultUserSettings } from '../types/settings';
import { fetchUserSettings, updateUserSettings } from '../api/settingsService';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../api/client';

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchSettings: (userId: string) => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => Promise<boolean>;
  saveSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...defaultUserSettings },
  isLoading: false,
  isSaving: false,
  error: null,

  fetchSettings: async (userId: string) => {
    if (!userId) return;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchUserSettings(userId);
      if (data) {
        set({ settings: data, isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to load settings.' });
    }
  },

  updateSetting: async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const currentSettings = get().settings;
    const previousValue = currentSettings[key];

    // Optimistic UI update
    set({
      settings: {
        ...currentSettings,
        [key]: value,
      },
    });

    let effectiveUserId = currentSettings.userId;
    if (!effectiveUserId || effectiveUserId === 'unknown') {
      effectiveUserId = useAuthStore.getState().user?.id;
    }
    if (!effectiveUserId || effectiveUserId === 'unknown') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) effectiveUserId = session.user.id;
      } catch {}
    }

    if (!effectiveUserId || effectiveUserId === 'unknown') {
      return true;
    }

    if (!currentSettings.userId) {
      set({ settings: { ...get().settings, userId: effectiveUserId } });
    }

    // Immediately synchronize local auth user state for profileVisibility
    if (key === 'profileVisibility') {
      const isPriv = value === 'private';
      useAuthStore.setState((s) => ({
        user: {
          ...s.user,
          isPrivateRestricted: isPriv,
          visibilityLevel: value as any,
        },
      }));
    }

    try {
      const res = await updateUserSettings(effectiveUserId, {
        [key]: value,
      });

      if (!res.success) {
        // Rollback on failure
        set({
          settings: {
            ...get().settings,
            [key]: previousValue,
          },
          error: res.error,
        });
        return false;
      }
      return true;
    } catch (err: any) {
      // Rollback on failure
      set({
        settings: {
          ...get().settings,
          [key]: previousValue,
        },
        error: err?.message || 'Failed to update setting.',
      });
      return false;
    }
  },

  saveSettings: async (updates: Partial<UserSettings>) => {
    const currentSettings = get().settings;
    let effectiveUserId = currentSettings.userId;
    if (!effectiveUserId || effectiveUserId === 'unknown') {
      effectiveUserId = useAuthStore.getState().user?.id;
    }
    if (!effectiveUserId || effectiveUserId === 'unknown') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) effectiveUserId = session.user.id;
      } catch {}
    }

    if (!effectiveUserId || effectiveUserId === 'unknown') {
      set({ settings: { ...currentSettings, ...updates } });
      return true;
    }

    if (!currentSettings.userId) {
      set({ settings: { ...get().settings, userId: effectiveUserId } });
    }

    set({ isSaving: true, error: null });
    try {
      const res = await updateUserSettings(effectiveUserId, updates);
      if (res.success) {
        set({
          settings: { ...currentSettings, ...updates, userId: effectiveUserId },
          isSaving: false,
          error: null,
        });
        return true;
      } else {
        set({ isSaving: false, error: res.error });
        return false;
      }
    } catch (err: any) {
      set({ isSaving: false, error: err?.message || 'Failed to save settings.' });
      return false;
    }
  },

  reset: () => {
    set({
      settings: { ...defaultUserSettings },
      isLoading: false,
      isSaving: false,
      error: null,
    });
  },
}));
