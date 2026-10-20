import { create } from 'zustand';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, Colors } from '../theme/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = '@booffin_theme_mode';

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  const sys = Appearance.getColorScheme();
  return sys === 'dark';
}

function syncWebDocumentTheme(isDark: boolean) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', isDark ? '#0B0F17' : '#FFFFFF');
      }
    } catch {}
  }
}

interface ThemeState {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: Colors;
  isInitialized: boolean;

  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  initTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'light',
  isDark: false,
  colors: lightColors,
  isInitialized: false,

  setThemeMode: async (mode: ThemeMode) => {
    const isDark = resolveIsDark(mode);
    const colors = isDark ? darkColors : lightColors;

    set({ themeMode: mode, isDark, colors });
    syncWebDocumentTheme(isDark);

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  },

  toggleTheme: async () => {
    const currentIsDark = get().isDark;
    const nextMode: ThemeMode = currentIsDark ? 'light' : 'dark';
    await get().setThemeMode(nextMode);
  },

  initTheme: async () => {
    if (get().isInitialized) return;

    let savedMode: ThemeMode = 'light';
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light' || stored === 'system') {
        savedMode = stored;
      }
    } catch {}

    const isDark = resolveIsDark(savedMode);
    const colors = isDark ? darkColors : lightColors;

    set({
      themeMode: savedMode,
      isDark,
      colors,
      isInitialized: true,
    });
    syncWebDocumentTheme(isDark);

    // Listen to OS system color-scheme changes in real-time
    Appearance.addChangeListener(({ colorScheme }) => {
      const currentMode = get().themeMode;
      if (currentMode === 'system') {
        const nextIsDark = colorScheme === 'dark';
        set({
          isDark: nextIsDark,
          colors: nextIsDark ? darkColors : lightColors,
        });
        syncWebDocumentTheme(nextIsDark);
      }
    });
  },
}));

/**
 * Convenient React hook to read and control theme across components
 */
export function useTheme() {
  const themeMode = useThemeStore((s) => s.themeMode);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return {
    themeMode,
    isDark,
    colors,
    setThemeMode,
    toggleTheme,
  };
}

export function useColors(): Colors {
  return useThemeStore((s) => s.colors);
}

export function useIsDark(): boolean {
  return useThemeStore((s) => s.isDark);
}

