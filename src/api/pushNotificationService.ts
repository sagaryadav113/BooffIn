import { Platform } from 'react-native';
import { supabase } from './client';

export type DevicePlatform = 'ios' | 'android' | 'web';

/**
 * Registers an Expo/APNs/FCM push token for the current user in public.user_push_tokens
 */
export async function registerPushToken(
  token: string,
  platform: DevicePlatform = (Platform.OS as DevicePlatform) || 'web'
): Promise<{ success: boolean; error: string | null }> {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid token' };
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase.from('user_push_tokens').upsert(
      {
        user_id: user.id,
        token: token.trim(),
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, token' }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to register push token' };
  }
}

/**
 * Unregisters a push token (e.g. on logout or disabling push notifications)
 */
export async function unregisterPushToken(token: string): Promise<{ success: boolean; error: string | null }> {
  if (!token) return { success: true, error: null };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return { success: true, error: null };

    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', token.trim());

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unregister push token' };
  }
}
