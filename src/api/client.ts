import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const memoryStorageCache = new Map<string, string>();

/**
 * Resilient, high-performance session storage adapter for Supabase Auth.
 * Uses AsyncStorage with synchronous in-memory cache and legacy SecureStore migration.
 * Prevents false logouts caused by Android KeyStore lockouts during sleep/inactivity.
 */
export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    // 1. Fast in-memory cache
    if (memoryStorageCache.has(key)) {
      return memoryStorageCache.get(key) ?? null;
    }

    // 2. Web storage
    if (Platform.OS === 'web') {
      try {
        const val = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        if (val) memoryStorageCache.set(key, val);
        return val;
      } catch {
        return null;
      }
    }

    // 3. Native AsyncStorage
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        memoryStorageCache.set(key, value);
        return value;
      }

      // 4. Backward-compatible migration from legacy SecureStore chunked storage
      try {
        const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunk_count`);
        if (chunkCountStr) {
          const count = parseInt(chunkCountStr, 10);
          if (!isNaN(count) && count > 0) {
            const chunks: string[] = [];
            for (let i = 0; i < count; i++) {
              const chunk = await SecureStore.getItemAsync(`${key}__chunk_${i}`);
              if (chunk !== null) chunks.push(chunk);
              else break;
            }
            if (chunks.length === count) {
              const migratedVal = chunks.join('');
              await AsyncStorage.setItem(key, migratedVal);
              memoryStorageCache.set(key, migratedVal);
              return migratedVal;
            }
          }
        }
        const direct = await SecureStore.getItemAsync(key);
        if (direct && direct !== '__CHUNKED__') {
          await AsyncStorage.setItem(key, direct);
          memoryStorageCache.set(key, direct);
          return direct;
        }
      } catch {}

      return null;
    } catch (err) {
      console.warn('[appStorage] getItem error:', err);
      return memoryStorageCache.get(key) ?? null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorageCache.set(key, value);

    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.warn('[appStorage] setItem error:', err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    memoryStorageCache.delete(key);

    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
      // Clean up legacy SecureStore keys
      SecureStore.deleteItemAsync(key).catch(() => {});
      SecureStore.deleteItemAsync(`${key}__chunk_count`).catch(() => {});
    } catch (err) {
      console.warn('[appStorage] removeItem error:', err);
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvstuqhrmagzqkgwlisl.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_fXyEsViLthF0T7A3NHBXpA_UUUVbrbx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: appStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
