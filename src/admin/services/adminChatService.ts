// ============================================================================
// BOOFFIN ADMIN PORTAL — INTERNAL TEAM COMMS & OPS CHAT SERVICE
// ============================================================================

import { supabase } from '../../api/client';
import { AdminChatMessage, AdminChatChannel } from '../types/chat';

export const adminChatService = {
  /**
   * Fetches recent messages for an admin channel.
   */
  async listMessages(channel: AdminChatChannel = 'general-ops', limit = 50): Promise<{ messages: AdminChatMessage[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_team_messages')
        .select('*')
        .eq('channel', channel)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.warn('adminChatService listMessages error:', error.message);
        return { messages: [], error: new Error(error.message) };
      }

      return { messages: (data as AdminChatMessage[]) || [], error: null };
    } catch (err: any) {
      return { messages: [], error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Dispatches a new internal message to a channel.
   */
  async sendMessage(params: {
    channel: AdminChatChannel;
    message: string;
    senderRole?: string;
  }): Promise<{ message: AdminChatMessage | null; error: Error | null }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { message: null, error: new Error('Unauthorized admin session required.') };
      }

      // Fetch sender name & role from admin_members
      const { data: member } = await supabase
        .from('admin_members')
        .select('full_name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      const senderName = member?.full_name || user.email?.split('@')[0] || 'Admin';
      const senderRole = member?.role || params.senderRole || 'ADMIN';

      const { data, error } = await supabase
        .from('admin_team_messages')
        .insert({
          sender_id: user.id,
          sender_name: senderName,
          sender_email: user.email || 'admin@letsbooffin.com',
          sender_role: senderRole,
          channel: params.channel,
          message: params.message.trim(),
        })
        .select('*')
        .single();

      if (error) return { message: null, error: new Error(error.message) };
      return { message: data as AdminChatMessage, error: null };
    } catch (err: any) {
      return { message: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  /**
   * Subscribes to real-time incoming messages on a specific channel.
   */
  subscribeToChannel(channel: AdminChatChannel, onNewMessage: (msg: AdminChatMessage) => void) {
    const subscription = supabase
      .channel(`admin_chat_${channel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_team_messages',
          filter: `channel=eq.${channel}`,
        },
        (payload) => {
          if (payload.new) {
            onNewMessage(payload.new as AdminChatMessage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  /**
   * Toggles pin on an operational message.
   */
  async togglePin(messageId: string, isPinned: boolean): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('admin_team_messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);

      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
};
