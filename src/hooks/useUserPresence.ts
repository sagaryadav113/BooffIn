// ============================================================================
// BOOFFIN — REALTIME USER PRESENCE TRACKER
// Connects app sessions to Supabase Presence channel for live user metrics
// ============================================================================

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { usePresenceStore } from '../store/usePresenceStore';

export const PRESENCE_CHANNEL_NAME = 'booffin-live-presence';

export function useUserPresence() {
  const user = useAuthStore((s) => s.user);
  const setOnlineUsers = usePresenceStore((s) => s.setOnlineUsers);

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

      const syncOnlineState = () => {
        if (!presenceChannel) return;
        const state = presenceChannel.presenceState();
        const onlineMap: Record<string, boolean> = {};

        Object.values(state).forEach((presences: any) => {
          if (Array.isArray(presences)) {
            presences.forEach((p: any) => {
              if (p?.user_id) {
                onlineMap[p.user_id] = true;
              }
            });
          }
        });

        setOnlineUsers(onlineMap);
      };

      presenceChannel
        .on('presence', { event: 'sync' }, syncOnlineState)
        .on('presence', { event: 'join' }, syncOnlineState)
        .on('presence', { event: 'leave' }, syncOnlineState);

      presenceChannel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user?.id || null,
            handle: user?.handle || 'anonymous',
            online_at: new Date().toISOString(),
            platform: Platform.OS,
          });
          syncOnlineState();
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
  }, [user?.id, setOnlineUsers]);
}
