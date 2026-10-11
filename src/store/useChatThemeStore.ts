import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/client';
import { ChatThemeConfig, ChatThemeId } from '../types/chatTheme';
import { CHAT_THEMES } from '../config/chatThemes';

interface ChatThemeState {
  themes: Record<string, ChatThemeId>;
  loadChatTheme: (workspaceId: string) => Promise<ChatThemeId>;
  setChatTheme: (workspaceId: string, themeId: ChatThemeId) => Promise<void>;
  getThemeConfig: (workspaceId?: string) => ChatThemeConfig;
}

export const useChatThemeStore = create<ChatThemeState>((set, get) => ({
  themes: {},

  loadChatTheme: async (workspaceId: string) => {
    if (!workspaceId) return 'default';
    try {
      const storageKey = `booffin_chat_theme_${workspaceId}`;
      const savedTheme = await AsyncStorage.getItem(storageKey);
      if (savedTheme && CHAT_THEMES[savedTheme as ChatThemeId]) {
        const themeId = savedTheme as ChatThemeId;
        set((state) => ({
          themes: { ...state.themes, [workspaceId]: themeId },
        }));
        return themeId;
      }
    } catch {}
    return 'default';
  },

  setChatTheme: async (workspaceId: string, themeId: ChatThemeId) => {
    if (!workspaceId) return;
    set((state) => ({
      themes: { ...state.themes, [workspaceId]: themeId },
    }));

    try {
      const storageKey = `booffin_chat_theme_${workspaceId}`;
      await AsyncStorage.setItem(storageKey, themeId);

      // Best-effort remote sync to workspace settings if user has permission
      try {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('settings')
          .eq('id', workspaceId)
          .maybeSingle();

        if (ws) {
          const currentSettings = (ws.settings as Record<string, any>) || {};
          await supabase
            .from('workspaces')
            .update({
              settings: {
                ...currentSettings,
                chat_theme: themeId,
              },
            })
            .eq('id', workspaceId);
        }
      } catch {}
    } catch (err) {
      console.warn('[useChatThemeStore] Failed to persist chat theme:', err);
    }
  },

  getThemeConfig: (workspaceId?: string) => {
    if (!workspaceId) return CHAT_THEMES.default;
    const themeId = get().themes[workspaceId] || 'default';
    return CHAT_THEMES[themeId] || CHAT_THEMES.default;
  },
}));
