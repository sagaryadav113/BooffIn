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
  useWindowDimensions,
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
  Sparkles,
  Smile,
  Paperclip,
  Clock,
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
      <View style={[styles.headerRow, isMobile && styles.headerRowMobile]}>
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

      {/* Mobile Horizontal Channels Switcher Bar */}
      {isMobile && (
        <View style={styles.mobileChannelBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileChannelScroll}>
            {CHANNELS.map((ch) => (
              <TouchableOpacity
                key={ch.key}
                style={[styles.mobileChannelPill, activeChannel === ch.key && styles.mobileChannelPillActive]}
                onPress={() => setActiveChannel(ch.key)}
              >
                <Hash size={13} color={activeChannel === ch.key ? '#059669' : '#64748B'} />
                <Text
                  style={[
                    styles.mobileChannelPillText,
                    activeChannel === ch.key && styles.mobileChannelPillTextActive,
                  ]}
                >
                  {ch.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Chat Layout (Left: Channel Switcher, Center: Messages, Right: Team Members) */}
      <View style={[styles.chatLayoutRow, isMobile && styles.chatLayoutRowMobile]}>
        {/* Left: Channels Sidebar (Desktop Only) */}
        {!isMobile && (
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
        )}

        {/* Center/Right: Message Feed */}
        <View style={[styles.feedColumn, isMobile && styles.feedColumnMobile]}>
          {/* Channel Header Bar */}
          <View style={[styles.channelHeaderBar, isMobile && styles.channelHeaderBarMobile]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.whatsappRoomAvatar}>
                <Hash size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.activeChannelTitle}>{currentChannelInfo.label}</Text>
                <Text style={styles.activeChannelDesc} numberOfLines={1}>
                  {isMobile ? `${teamMembers.length} team members active` : currentChannelInfo.desc}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.mobileSyncIconBtn} onPress={loadMessages}>
              <RefreshCw size={15} color="#059669" />
            </TouchableOpacity>
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
            style={[styles.messagesScroll, isMobile && styles.messagesScrollMobile]}
            contentContainerStyle={[styles.messagesContent, isMobile && styles.messagesContentMobile]}
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
              messages.map((msg, index) => {
                const isMe = msg.sender_id === userId || msg.sender_email === email;
                const avatarTheme = getAvatarColor(msg.sender_id || msg.sender_name || 'Admin');
                const displayName = msg.sender_name || 'Admin';
                const showDateDivider = index === 0 || index === Math.floor(messages.length / 2);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateDivider && (
                      <View style={styles.dateDividerRow}>
                        <View style={styles.dateDividerBadge}>
                          <Text style={styles.dateDividerText}>
                            Today, {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    )}

                    {isMe ? (
                      /* Sent Message (Right Aligned — WhatsApp Green) */
                      <View style={[styles.sentMessageContainer, isMobile && styles.sentMessageContainerMobile]}>
                        <View style={[styles.sentBubble, isMobile && styles.sentBubbleMobile, msg.is_pinned && styles.pinnedMessageBubble]}>
                          <Text style={[styles.sentMessageText, isMobile && styles.sentMessageTextMobile]}>
                            {msg.message}
                          </Text>
                          <View style={styles.bubbleMetaRow}>
                            <Text style={styles.sentTimestamp}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={styles.doubleCheckmark}>✓✓</Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      /* Received Message (Left Aligned — WhatsApp White) */
                      <View style={[styles.receivedMessageContainer, isMobile && styles.receivedMessageContainerMobile]}>
                        <View style={styles.receivedBubbleRow}>
                          <View style={styles.avatarWrapper}>
                            <View
                              style={[
                                styles.avatarPill,
                                { backgroundColor: avatarTheme.bg, borderColor: avatarTheme.border },
                              ]}
                            >
                              <Text style={[styles.avatarPillText, { color: avatarTheme.text }]}>
                                {displayName.substring(0, 2).toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.receivedBubble, isMobile && styles.receivedBubbleMobile, msg.is_pinned && styles.pinnedMessageBubble]}>
                            <Text style={[styles.senderHeaderLeft, { color: avatarTheme.text }]}>
                              {displayName}
                            </Text>
                            <Text style={[styles.receivedMessageText, isMobile && styles.receivedMessageTextMobile]}>
                              {msg.message}
                            </Text>
                            <View style={styles.bubbleMetaRowLeft}>
                              <Text style={styles.receivedTimestamp}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </ScrollView>

          {/* Bottom Floating Message Input Bar (WhatsApp UI/UX) */}
          <View style={[styles.inputContainerOuter, isMobile && styles.inputContainerOuterMobile]}>
            {isMobile ? (
              <View style={styles.whatsappInputRowMobile}>
                {/* White Capsule for Input, Emoji, Attach */}
                <View style={styles.whatsappCapsule}>
                  <TouchableOpacity
                    style={styles.whatsappIconButton}
                    onPress={() => setInputText((prev) => prev + ' 😊')}
                  >
                    <Smile size={20} color="#64748B" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.whatsappTextInput}
                    placeholder="Message..."
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSendMessage}
                    returnKeyType="send"
                  />

                  <TouchableOpacity
                    style={styles.whatsappIconButton}
                    onPress={() => alert('Attachment upload ready.')}
                  >
                    <Paperclip size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Circular Green Send Button */}
                <TouchableOpacity
                  style={[styles.whatsappSendBtnCircle, (!inputText.trim() || sending) && styles.whatsappSendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Desktop Pill Input Bar */
              <View style={styles.inputBarPill}>
                <View style={styles.aiBadgeIcon}>
                  <Sparkles size={14} color="#FFFFFF" />
                </View>

                <TextInput
                  style={styles.chatInputPill}
                  placeholder="Write a message..."
                  placeholderTextColor="#94A3B8"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={handleSendMessage}
                  returnKeyType="send"
                />

                <View style={styles.inputIconsGroup}>
                  <TouchableOpacity
                    style={styles.inputIconButton}
                    onPress={() => setInputText((prev) => prev + ' 😊')}
                  >
                    <Smile size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.inputIconButton}
                    onPress={() => alert('Document & attachment upload ready.')}
                  >
                    <Paperclip size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sendPillBtn, (!inputText.trim() || sending) && styles.sendPillBtnDisabled]}
                    onPress={handleSendMessage}
                    disabled={!inputText.trim() || sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <Send size={16} color={inputText.trim() ? '#059669' : '#94A3B8'} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  headerRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  mobileChannelBarContainer: {
    marginBottom: 12,
  },
  mobileChannelScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  mobileChannelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileChannelPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  mobileChannelPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  mobileChannelPillTextActive: {
    color: '#059669',
    fontWeight: '700',
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
  // Date divider
  dateDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    gap: 12,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Sent message (Right-aligned)
  sentMessageContainer: {
    alignSelf: 'flex-end',
    maxWidth: '75%',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  senderHeaderRight: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    marginRight: 40,
  },
  sentBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  sentBubble: {
    backgroundColor: 'rgba(6, 78, 59, 0.08)', // Dark green transparent matching app theme
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sentMessageText: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 19,
  },
  sentTimestamp: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  // Received message (Left-aligned)
  receivedMessageContainer: {
    alignSelf: 'flex-start',
    maxWidth: '75%',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  senderHeaderLeft: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 40,
  },
  receivedBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  receivedBubble: {
    backgroundColor: 'rgba(241, 245, 249, 0.85)', // Light grey transparent
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  receivedMessageText: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 19,
  },
  receivedTimestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    alignSelf: 'flex-start',
  },

  pinnedMessageBubble: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },

  // Avatar Wrapper & Online Dot
  avatarWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Floating Input Pill Bar
  inputContainerOuter: {
    padding: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  inputBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 10,
  },
  aiBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#8B5CF6', // Purple badge from screenshot
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInputPill: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4,
  },
  inputIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputIconButton: {
    padding: 6,
  },
  sendPillBtn: {
    padding: 6,
  },
  sendPillBtnDisabled: {
    opacity: 0.4,
  },

  // WhatsApp Mobile Styles
  chatLayoutRowMobile: {
    borderRadius: 0,
    borderWidth: 0,
    minHeight: '100%',
    flex: 1,
  },
  feedColumnMobile: {
    flex: 1,
  },
  channelHeaderBarMobile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  whatsappRoomAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileSyncIconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
  },
  messagesScrollMobile: {
    backgroundColor: '#EFEAE2', // WhatsApp chat sand wallpaper background
  },
  messagesContentMobile: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    paddingBottom: 24,
    gap: 8,
  },
  dateDividerBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  sentMessageContainerMobile: {
    maxWidth: '85%',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  sentBubbleMobile: {
    backgroundColor: '#DCF8C6', // WhatsApp sent green
    borderWidth: 0,
    borderRadius: 12,
    borderTopRightRadius: 2,
    paddingHorizontal: 11,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
    elevation: 1,
  },
  sentMessageTextMobile: {
    fontSize: 14,
    color: '#111B21',
    lineHeight: 19,
  },
  bubbleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  doubleCheckmark: {
    fontSize: 11,
    fontWeight: '700',
    color: '#53BDEB', // WhatsApp blue double tick
  },
  receivedMessageContainerMobile: {
    maxWidth: '85%',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  receivedBubbleMobile: {
    backgroundColor: '#FFFFFF', // WhatsApp received white
    borderWidth: 0,
    borderRadius: 12,
    borderTopLeftRadius: 2,
    paddingHorizontal: 11,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
    elevation: 1,
  },
  receivedMessageTextMobile: {
    fontSize: 14,
    color: '#111B21',
    lineHeight: 19,
  },
  bubbleMetaRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  inputContainerOuterMobile: {
    backgroundColor: '#EFEAE2',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 0,
  },
  whatsappInputRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsappCapsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  whatsappIconButton: {
    padding: 6,
  },
  whatsappTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#111B21',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  whatsappSendBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  whatsappSendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
});
