// ============================================================================
// BOOFFIN ADMIN PORTAL — INTERNAL ADMIN TEAM COMMS (OPS CHAT ROOM)
// ============================================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminBadge } from '../components/AdminBadge';
import { adminChatService } from '../services/adminChatService';
import { adminSecurityService } from '../services/adminSecurityService';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminChatMessage, AdminChatChannel } from '../types/chat';
import {
  MessagesSquare,
  Send,
  Hash,
  Pin,
  Shield,
  AlertTriangle,
  Radio,
  Users,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';

const CHANNELS: { key: AdminChatChannel; label: string; desc: string; icon: string }[] = [
  { key: 'general-ops', label: 'general-ops', desc: 'Daily operations & team coordination', icon: 'Hash' },
  { key: 'trust-safety', label: 'trust-safety', desc: 'Moderation, bans & content appeals', icon: 'Shield' },
  { key: 'tech-incidents', label: 'tech-incidents', desc: 'Server health, bugs & error reports', icon: 'AlertTriangle' },
  { key: 'announcements', label: 'announcements', desc: 'Company updates & policy changes', icon: 'Radio' },
];

// WhatsApp-style distinct avatar color themes for team members
const AVATAR_PALETTES = [
  { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' }, // Violet
  { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' }, // Sky Blue
  { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }, // Amber / Gold
  { bg: '#FCE7F3', text: '#BE185D', border: '#F472B6' }, // Pink / Rose
  { bg: '#CCFBF1', text: '#0F766E', border: '#99F6E4' }, // Teal
  { bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74' }, // Orange
  { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE' }, // Indigo
  { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' }, // Emerald
  { bg: '#FAE8FF', text: '#A21CAF', border: '#F0ABFC' }, // Fuchsia
  { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' }, // Crimson
  { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' }, // Slate
];

export const getAvatarColor = (identifier: string) => {
  if (!identifier) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
};

export const AdminOpsChatView: React.FC = () => {
  const { userId, email } = useAdminAuth();
  const [activeChannel, setActiveChannel] = useState<AdminChatChannel>('general-ops');
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const [msgRes, teamRes] = await Promise.all([
      adminChatService.listMessages(activeChannel),
      adminSecurityService.listAdminMembers(),
    ]);

    if (msgRes.error) {
      setErrorMessage(`Failed to load channel messages: ${msgRes.error.message}`);
      setMessages([]);
    } else {
      setMessages(msgRes.messages);
    }

    if (!teamRes.error && teamRes.members) {
      setTeamMembers(teamRes.members);
    }

    setLoading(false);
  }, [activeChannel]);

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time incoming messages
    const unsubscribe = adminChatService.subscribeToChannel(activeChannel, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeChannel, loadMessages]);

  useEffect(() => {
    // Scroll to bottom on new messages
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    const res = await adminChatService.sendMessage({
      channel: activeChannel,
      message: text,
    });

    setSending(false);

    if (res.error) {
      setErrorMessage(`Could not send message: ${res.error.message}`);
    } else if (res.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.message!.id)) return prev;
        return [...prev, res.message!];
      });
    }
  };

  const handleTogglePin = async (messageId: string, currentPin?: boolean) => {
    await adminChatService.togglePin(messageId, !currentPin);
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_pinned: !currentPin } : m))
    );
  };

  const currentChannelInfo = CHANNELS.find((c) => c.key === activeChannel) || CHANNELS[0];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Internal Admin Team Comms</Text>
          <Text style={styles.pageSubtitle}>
            Encrypted staff operations room • Real-time operational coordination
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadMessages}>
          <RefreshCw size={14} color={ADMIN_COLORS.textSecondary} />
          <Text style={styles.refreshBtnText}>Sync Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Main Chat Layout (Left: Channel Switcher, Center: Messages, Right: Team Members) */}
      <View style={styles.chatLayoutRow}>
        {/* Left: Channels Sidebar */}
        <View style={styles.channelsColumn}>
          <Text style={styles.columnHeader}>CHANNELS</Text>
          {CHANNELS.map((ch) => (
            <TouchableOpacity
              key={ch.key}
              style={[styles.channelItem, activeChannel === ch.key && styles.channelItemActive]}
              onPress={() => setActiveChannel(ch.key)}
            >
              <Hash size={15} color={activeChannel === ch.key ? '#059669' : '#64748B'} />
              <Text
                style={[
                  styles.channelItemText,
                  activeChannel === ch.key && styles.channelItemTextActive,
                ]}
              >
                {ch.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          {/* Team Roster Summary */}
          <Text style={styles.columnHeader}>ONLINE ADMINS ({teamMembers.length})</Text>
          <ScrollView style={styles.rosterList}>
            {teamMembers.map((m) => {
              const rosterColor = getAvatarColor(m.user_id || m.full_name || m.email);
              const displayName = m.full_name || m.email?.split('@')[0] || 'Admin';

              return (
                <View key={m.user_id} style={styles.rosterItem}>
                  <View
                    style={[
                      styles.rosterAvatar,
                      {
                        backgroundColor: rosterColor.bg,
                        borderColor: rosterColor.border,
                      },
                    ]}
                  >
                    <Text style={[styles.rosterAvatarText, { color: rosterColor.text }]}>
                      {displayName.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rosterName, { color: rosterColor.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <Text style={styles.rosterRole}>{m.role}</Text>
                  </View>
                  <View style={styles.onlineDot} />
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Center/Right: Message Feed */}
        <View style={styles.feedColumn}>
          {/* Channel Header Bar */}
          <View style={styles.channelHeaderBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Hash size={18} color="#059669" />
              <Text style={styles.activeChannelTitle}>{currentChannelInfo.label}</Text>
            </View>
            <Text style={styles.activeChannelDesc}>{currentChannelInfo.desc}</Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <AlertTriangle size={14} color="#991B1B" />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          )}

          {/* Messages Scroll Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
          >
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MessagesSquare size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Welcome to #{activeChannel}</Text>
                <Text style={styles.emptySubtitle}>
                  This is the start of the #{activeChannel} internal team operations room.
                </Text>
              </View>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === userId || msg.sender_email === email;
                const avatarTheme = getAvatarColor(msg.sender_id || msg.sender_name || 'Admin');

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isMe ? styles.sentMessageRow : styles.receivedMessageRow,
                      msg.is_pinned && styles.pinnedMessageRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarPill,
                        {
                          backgroundColor: avatarTheme.bg,
                          borderColor: avatarTheme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.avatarPillText, { color: avatarTheme.text }]}>
                        {(msg.sender_name || 'A').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      {/* Sender Meta */}
                      <View style={styles.senderMetaRow}>
                        <Text style={[styles.senderName, { color: avatarTheme.text }]}>
                          {msg.sender_name} {isMe ? '(You)' : ''}
                        </Text>
                        <AdminBadge
                          label={msg.sender_role}
                          variant={msg.sender_role === 'SUPER_ADMIN' ? 'emerald' : 'info'}
                          size="sm"
                        />
                        <Text style={styles.timestampText}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {msg.is_pinned && (
                          <View style={styles.pinBadge}>
                            <Pin size={10} color="#B45309" />
                            <Text style={styles.pinBadgeText}>PINNED</Text>
                          </View>
                        )}
                      </View>

                      {/* Message Content */}
                      <Text style={styles.messageText}>{msg.message}</Text>
                    </View>

                    {/* Pin button */}
                    <TouchableOpacity
                      style={styles.pinBtn}
                      onPress={() => handleTogglePin(msg.id, msg.is_pinned)}
                    >
                      <Pin size={12} color={msg.is_pinned ? '#B45309' : '#94A3B8'} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Bottom Message Input Bar */}
          <View style={styles.inputBarRow}>
            <TextInput
              style={styles.chatInput}
              placeholder={`Message #${activeChannel}... (Press enter to send)`}
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={15} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chatLayoutRow: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    minHeight: 560,
  },
  channelsColumn: {
    width: 220,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 14,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  channelItemActive: {
    backgroundColor: '#ECFDF5',
  },
  channelItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  channelItemTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  rosterList: {
    flex: 1,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  rosterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterAvatarText: {
    fontSize: 9,
    fontWeight: '800',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  rosterName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  rosterRole: {
    fontSize: 10,
    color: '#64748B',
  },
  feedColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  channelHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  activeChannelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeChannelDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    paddingHorizontal: 14,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  centerLoading: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sentMessageRow: {
    backgroundColor: 'rgba(6, 78, 59, 0.07)', // Dark green transparent matching BooffIn theme
    borderColor: 'rgba(5, 150, 105, 0.28)',
    borderRadius: 12,
  },
  receivedMessageRow: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)', // Light grey transparent
    borderColor: 'rgba(226, 232, 240, 0.95)',
    borderRadius: 12,
  },
  pinnedMessageRow: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  avatarPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  senderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pinBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  messageText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
  },
  pinBtn: {
    padding: 4,
  },
  inputBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  sendBtn: {
    backgroundColor: '#059669',
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
});
