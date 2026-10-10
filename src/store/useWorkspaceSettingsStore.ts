import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/client';
import { WorkspaceSettings, DEFAULT_WORKSPACE_SETTINGS } from '../types/workspaceSettings';

interface WorkspaceSettingsState {
  settings: WorkspaceSettings;
  isLoading: boolean;
  isSaving: boolean;
  loadSettings: (userId?: string) => Promise<void>;
  updateSetting: <K extends keyof WorkspaceSettings>(
    key: K,
    value: WorkspaceSettings[K],
    userId?: string
  ) => Promise<void>;
  resetSettings: (userId?: string) => Promise<void>;
}

export const useWorkspaceSettingsStore = create<WorkspaceSettingsState>((set, get) => ({
  settings: DEFAULT_WORKSPACE_SETTINGS,
  isLoading: true,
  isSaving: false,

  loadSettings: async (userId?: string) => {
    try {
      set({ isLoading: true });
      const storageKey = userId
        ? `booffin_ws_settings_${userId}`
        : 'booffin_ws_settings_default';

      const localData = await AsyncStorage.getItem(storageKey);
      let initialSettings = DEFAULT_WORKSPACE_SETTINGS;

      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          initialSettings = { ...DEFAULT_WORKSPACE_SETTINGS, ...parsed };
        } catch {}
      }

      set({ settings: initialSettings, isLoading: false });

      // Sync from Supabase profiles / preferences if user is logged in
      if (userId) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('workspace_settings')
            .eq('id', userId)
            .maybeSingle();

          if (!error && data?.workspace_settings) {
            const remoteSettings = {
              ...DEFAULT_WORKSPACE_SETTINGS,
              ...data.workspace_settings,
            };
            set({ settings: remoteSettings });
            await AsyncStorage.setItem(storageKey, JSON.stringify(remoteSettings));
          }
        } catch {}
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value, userId) => {
    const current = get().settings;
    const updated = { ...current, [key]: value };
    set({ settings: updated, isSaving: true });

    try {
      const storageKey = userId
        ? `booffin_ws_settings_${userId}`
        : 'booffin_ws_settings_default';

      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));

      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({ workspace_settings: updated })
            .eq('id', userId);
        } catch {}
      }
    } catch (err) {
      console.warn('[WorkspaceSettingsStore] Failed to persist setting:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  resetSettings: async (userId) => {
    set({ settings: DEFAULT_WORKSPACE_SETTINGS });
    const storageKey = userId
      ? `booffin_ws_settings_${userId}`
      : 'booffin_ws_settings_default';
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(DEFAULT_WORKSPACE_SETTINGS));
      if (userId) {
        await supabase
          .from('profiles')
          .update({ workspace_settings: DEFAULT_WORKSPACE_SETTINGS })
          .eq('id', userId);
      }
    } catch {}
  },
}));
