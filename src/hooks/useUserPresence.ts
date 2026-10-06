// ============================================================================
// BOOFFIN — REALTIME USER PRESENCE TRACKER
// Connects app sessions to Supabase Presence channel for live user metrics
// ============================================================================

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

export const PRESENCE_CHANNEL_NAME = 'booffin-live-presence';

export function useUserPresence() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let presenceChannel: any = null;

    try {
      const presenceKey = user?.id || `anon-${Math.random().toString(36).substring(2, 9)}`;

      presenceChannel = supabase.channel(PRESENCE_CHANNEL_NAME, {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      presenceChannel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user?.id || null,
            handle: user?.handle || 'anonymous',
            online_at: new Date().toISOString(),
            platform: Platform.OS,
          });
        }
      });
    } catch (err) {
      console.warn('Presence tracking error:', err);
    }

    return () => {
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [user?.id]);
}
