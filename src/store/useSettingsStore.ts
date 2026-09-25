import { create } from 'zustand';
import { UserSettings, defaultUserSettings } from '../types/settings';
import { fetchUserSettings, updateUserSettings } from '../api/settingsService';

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

    if (!currentSettings.userId) {
      return true;
    }

    try {
      const res = await updateUserSettings(currentSettings.userId, {
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
    if (!currentSettings.userId) {
      set({ settings: { ...currentSettings, ...updates } });
      return true;
    }

    set({ isSaving: true, error: null });
    try {
      const res = await updateUserSettings(currentSettings.userId, updates);
      if (res.success) {
        set({
          settings: { ...currentSettings, ...updates },
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
