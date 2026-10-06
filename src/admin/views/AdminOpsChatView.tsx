// ============================================================================
// BOOFFIN ADMIN PORTAL — INTERNAL OPERATIONS & TEAM CHAT
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
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { adminChatService } from '../services/adminChatService';
import { adminSecurityService } from '../services/adminSecurityService';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminChatMessage, AdminChatChannel } from '../types/chat';
import {
  Send,
  Hash,
  Shield,
  AlertTriangle,
  Radio,
  RefreshCw,
  Paperclip,
  Smile,
  CheckCircle2,
  Clock
} from 'lucide-react-native';

const CHANNELS: { key: AdminChatChannel; label: string; desc: string }[] = [
  { key: 'general-ops', label: '# general-ops', desc: 'Daily operations & team coordination' },
  { key: 'trust-safety', label: '# trust-safety', desc: 'Moderation, bans & content appeals' },
  { key: 'tech-incidents', label: '# tech-incidents', desc: 'Server health, bugs & error reports' },
  { key: 'announcements', label: '# announcements', desc: 'Platform announcements & updates' },
];

export const AdminOpsChatView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const { userId, email } = useAdminAuth();
  const [activeChannel, setActiveChannel] = useState<AdminChatChannel>('general-ops');
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const msgRes = await adminChatService.listMessages(activeChannel);

    if (msgRes.error) {
      setErrorMessage(`Failed to load channel messages: ${msgRes.error.message}`);
      setMessages([]);
    } else {
      setMessages(msgRes.messages);
    }

    setLoading(false);
  }, [activeChannel]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;
    setSending(true);

    const content = inputText.trim();
    setInputText('');

    const res = await adminChatService.sendMessage({
      channel: activeChannel,
      message: content,
    });

    setSending(false);

    if (res.error) {
      setErrorMessage(`Failed to dispatch message: ${res.error.message}`);
      setInputText(content);
    } else if (res.message) {
      setMessages(prev => [...prev, res.message!]);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const activeChannelDef = CHANNELS.find(c => c.key === activeChannel) || CHANNELS[0];

  return (
    <View style={styles.container}>
      {/* Header & Channel Segmented Bar */}
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>{activeChannelDef.label}</Text>
            <Text style={styles.pageSubtitle}>{activeChannelDef.desc}</Text>
          </View>

          <TouchableOpacity style={styles.refreshIconBtn} onPress={loadMessages}>
            <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Channel Switcher */}
        <View style={styles.channelTabBar}>
          {CHANNELS.map((ch) => (
            <TouchableOpacity
              key={ch.key}
              style={[styles.channelTabBtn, activeChannel === ch.key && styles.channelTabBtnActive]}
              onPress={() => setActiveChannel(ch.key)}
            >
              <Text style={[styles.channelTabText, activeChannel === ch.key && styles.channelTabTextActive]}>
                {ch.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Message Timeline Area */}
      <View style={styles.chatArea}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
            <Text style={styles.loadingText}>Connecting to ops channel stream...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Channel is quiet</Text>
            <Text style={styles.emptySub}>Post a message to initiate team discussion in {activeChannelDef.label}.</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m, idx) => {
              const formattedTime = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <View key={m.id || idx} style={styles.messageRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(m.sender_name || 'OP').substring(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.messageBody}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.senderName}>{m.sender_name || 'Operator'}</Text>
                      <Text style={styles.timestamp}>{formattedTime}</Text>
                    </View>
                    <Text style={styles.messageContent}>{m.message}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Pinned Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={`Message ${activeChannelDef.label}...`}
            placeholderTextColor={ADMIN_COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={13} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  headerSection: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 1,
  },
  refreshIconBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    padding: 7,
    borderRadius: ADMIN_RADII.button,
  },
  channelTabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: ADMIN_COLORS.bgHover,
    padding: 2,
    borderRadius: ADMIN_RADII.button,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    gap: 4,
  },
  channelTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: ADMIN_RADII.badge,
  },
  channelTabBtnActive: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  channelTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  channelTabTextActive: {
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '600',
  },
  chatArea: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 4,
  },
  messageScroll: {
    flex: 1,
  },
  messageListContent: {
    padding: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: ADMIN_COLORS.bgActive,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldPrimary,
  },
  messageBody: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  timestamp: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
  },
  messageContent: {
    fontSize: 13,
    color: ADMIN_COLORS.textPrimary,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    backgroundColor: ADMIN_COLORS.bgCanvas,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
  },
  sendBtn: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    width: 36,
    height: 36,
    borderRadius: ADMIN_RADII.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
