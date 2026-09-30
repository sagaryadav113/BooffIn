import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1500;

export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    try {
      // Check if item was split into chunks (for Android 2048-byte SecureStore limit)
      const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunk_count`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        if (!isNaN(count) && count > 0) {
          const chunkPromises: Promise<string | null>[] = [];
          for (let i = 0; i < count; i++) {
            chunkPromises.push(SecureStore.getItemAsync(`${key}__chunk_${i}`));
          }
          const chunks = await Promise.all(chunkPromises);
          if (chunks.every((c) => c !== null)) {
            return chunks.join('');
          }
        }
      }
      const direct = await SecureStore.getItemAsync(key);
      if (direct === '__CHUNKED__') {
        return null;
      }
      return direct;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch {}
      return;
    }
    try {
      if (value.length <= CHUNK_SIZE) {
        // Direct storage
        await SecureStore.setItemAsync(key, value);
        // Clean up any previously stored chunks
        const oldChunkCount = await SecureStore.getItemAsync(`${key}__chunk_count`);
        if (oldChunkCount) {
          const count = parseInt(oldChunkCount, 10);
          for (let i = 0; i < count; i++) {
            await SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => {});
          }
          await SecureStore.deleteItemAsync(`${key}__chunk_count`).catch(() => {});
        }
      } else {
        // Split into chunks to respect Android Keystore 2048-byte limit
        const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < chunkCount; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}__chunk_${i}`, chunk);
        }
        await SecureStore.setItemAsync(`${key}__chunk_count`, String(chunkCount));
        await SecureStore.setItemAsync(key, '__CHUNKED__');
      }
    } catch (err) {
      console.warn('SecureStore setItem error:', err);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch {}
      return;
    }
    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${key}__chunk_count`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}__chunk_${i}`).catch(() => {});
        }
        await SecureStore.deleteItemAsync(`${key}__chunk_count`).catch(() => {});
      }
      await SecureStore.deleteItemAsync(key).catch(() => {});
    } catch (err) {
      console.warn('SecureStore removeItem error:', err);
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
