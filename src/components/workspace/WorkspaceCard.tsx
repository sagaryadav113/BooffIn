import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Shield,
  Users,
  Lock,
  MessageSquare,
  CheckCircle2,
  Check,
  CheckCheck,
  Heart,
  Pin,
  BellOff,
  Archive,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { GroupCollageAvatar } from './GroupCollageAvatar';
import { Workspace } from '../../types/workspace';

import { useAuthStore } from '../../store/useAuthStore';
import { usePresenceStore } from '../../store/usePresenceStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { deriveSharedSessionKey, derivePodSessionKey, decryptTextMessage } from '../../utils/e2eeCrypto';

interface WorkspaceCardProps {
  workspace: Workspace;
  onPress?: () => void;
  showDividers?: boolean;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  onPress,
  showDividers = true,
}) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);

  const handlePress = () => {
    useWorkspaceStore.getState().markAsRead(workspace.id);
    if (onPress) {
      onPress();
    } else {
      router.push(`/workspace/${workspace.id}` as any);
    }
  };

  const isDM = workspace.type === 'dm';
  const isCommunity = workspace.type === 'community';
  const isInnerCircle = workspace.type === 'inner_circle';

  const unreadCount = workspace.unread_count || 0;
  const isPinned = Boolean(workspace.is_pinned);
  const isMuted = Boolean(workspace.is_muted);
  const isArchived = Boolean(workspace.is_archived);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const timeText = workspace.last_message ? formatTime(workspace.last_message.created_at) : '';

  const displayName = isDM
    ? workspace.other_user?.fullName || workspace.name || 'Researcher'
    : workspace.name;

  const [decryptedSnippet, setDecryptedSnippet] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function resolvePreview() {
      const lm = workspace.last_message;
      if (!lm) {
        if (isMounted) setDecryptedSnippet(null);
        return;
      }

      const isMsgDeleted = Boolean(
        lm.is_deleted === true ||
        lm.content === '🚫 This message was deleted'
      );
      if (isMsgDeleted) {
        if (isMounted) setDecryptedSnippet(null);
        AsyncStorage.removeItem(`e2ee_cache_${lm.id}`).catch(() => {});
        return;
      }

      // If message is not encrypted and already has real plaintext, nothing to decrypt
      if (lm.content && lm.content !== '🔒 Encrypted message' && !lm.content.startsWith('🔒 [')) {
        if (isMounted) setDecryptedSnippet(null);
        return;
      }

      // 1. Check local device cache
      try {
        const cached = await AsyncStorage.getItem(`e2ee_cache_${lm.id}`);
        if (cached && isMounted) {
          setDecryptedSnippet(cached);
          return;
        }
      } catch {}

      // 2. Decrypt on-the-fly using session key
      const cipher = lm.e2ee_ciphertext || (lm as any).attachments?.e2ee_ciphertext;
      const nonce = lm.e2ee_nonce || (lm as any).attachments?.e2ee_nonce;
      if (cipher && nonce && currentUserId) {
        try {
          let sessionKey: string | null = null;
          if (isDM) {
            const peerId =
              workspace.other_user?.id ||
              (workspace.dm_participant_a === currentUserId
                ? workspace.dm_participant_b
                : workspace.dm_participant_a);
            if (peerId) {
              sessionKey = await deriveSharedSessionKey(currentUserId, peerId, workspace.id);
            }
          } else if (isInnerCircle) {
            sessionKey = await derivePodSessionKey(workspace.id, currentUserId);
          }

          if (sessionKey) {
            const dec = await decryptTextMessage(cipher, nonce, sessionKey);
            if (dec && !dec.startsWith('🔒 [') && isMounted) {
              setDecryptedSnippet(dec);
              AsyncStorage.setItem(`e2ee_cache_${lm.id}`, dec).catch(() => {});
            }
          }
        } catch {}
      }
    }
    resolvePreview();
    return () => {
      isMounted = false;
    };
  }, [
    workspace.last_message?.id,
    workspace.last_message?.content,
    workspace.last_message?.is_deleted,
    workspace.last_message?.e2ee_ciphertext,
    currentUserId,
    workspace.id,
    isDM,
    isInnerCircle,
  ]);

  const getPreviewSnippet = () => {
    if (!workspace.last_message) {
      return isDM
        ? 'No messages yet'
        : workspace.description || 'Welcome to this workspace';
    }
    const lm = workspace.last_message;
    const isMsgDeleted = Boolean(
      lm.is_deleted === true ||
      lm.content === '🚫 This message was deleted'
    );
    if (isMsgDeleted) return '🚫 This message was deleted';
    const isAudio = Boolean(
      lm.message_type === 'audio' ||
      lm.message_type === 'voice_note' ||
      lm.audio_metadata ||
      (lm.attachments as any)?.audio_metadata ||
      (typeof lm.content === 'string' && lm.content.startsWith('🎙️')) ||
      (lm.media_urls && lm.media_urls.some((u: string) => {
        const lower = (u || '').toLowerCase();
        return (
          lower.endsWith('.webm') ||
          lower.endsWith('.mp3') ||
          lower.endsWith('.m4a') ||
          lower.endsWith('.wav') ||
          lower.endsWith('.ogg') ||
          lower.includes('/audio/') ||
          lower.includes('/voice-notes/')
        );
      }))
    );
    if (isAudio) return '🎙️ Voice note';

    const isDoc = Boolean(
      lm.message_type === 'document' ||
      lm.document_metadata ||
      (lm.attachments as any)?.document_metadata
    );
    if (isDoc) return `📄 ${lm.document_metadata?.name || (lm.attachments as any)?.document_metadata?.name || 'Document'}`;

    const isImg = Boolean(
      lm.message_type === 'image' ||
      (typeof lm.content === 'string' && lm.content === '📷 Shared photo') ||
      (lm.media_urls && lm.media_urls.length > 0 && !isAudio && !isDoc)
    );
    if (isImg) return '📷 Photo';

    if (lm.message_type === 'paper_doi' || lm.doi_metadata) return `🔬 ${lm.doi_metadata?.title || 'Research paper'}`;
    if (lm.message_type === 'poll') return `📊 Poll: ${lm.content}`;
    if (lm.message_type === 'post') return '📑 Shared post';
    if (lm.message_type === 'profile') return '👤 Shared researcher profile';
    if (lm.message_type === 'call_log') return lm.content;

    if (decryptedSnippet) return decryptedSnippet;
    if (lm.content && lm.content !== '🔒 Encrypted message' && !lm.content.startsWith('🔒 [')) {
      return lm.content;
    }
    return 'Message';
  };

  const previewSnippet = getPreviewSnippet();

  // Determine read receipt state
  const isLastMessageMine = Boolean(
    workspace.last_message?.sender_id &&
    currentUserId &&
    workspace.last_message.sender_id === currentUserId
  );

  const isOtherUserRead = Boolean(
    isLastMessageMine &&
    workspace.other_last_read_at &&
    workspace.last_message &&
    new Date(workspace.other_last_read_at).getTime() >= new Date(workspace.last_message.created_at).getTime()
  );

  const isOtherUserOnline = Boolean(
    isDM && workspace.other_user?.id && onlineUserIds[workspace.other_user.id]
  );

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[
        styles.container,
        unreadCount > 0 && styles.unreadContainer,
        isPinned && styles.pinnedContainer,
      ]}
    >
      {/* Left Avatar (48px) */}
      <View style={styles.avatarWrapper}>
        {isDM ? (
          <View style={{ position: 'relative' }}>
            <Avatar
              uri={workspace.other_user?.avatarUrl || workspace.avatar_url || undefined}
              name={displayName}
              size="md"
            />
            {isOtherUserOnline && <View style={styles.presenceDot} />}
          </View>
        ) : (
          <Avatar
            uri={workspace.avatar_url || undefined}
            name={workspace.name}
            size="md"
          />
        )}
      </View>

      {/* Center Body */}
      <View style={styles.infoSection}>
        <View style={styles.titleRow}>
          <View style={styles.nameRow}>
            {isPinned && (
              <View style={styles.pinnedBadgeIcon}>
                <Pin size={12} color="#164E3F" fill="#164E3F" />
              </View>
            )}
            <Text style={[styles.name, isPinned && styles.pinnedNameText]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          {/* Right Timestamp & Icons */}
          <View style={styles.timestampCol}>
            {timeText ? <Text style={styles.timeText}>{timeText}</Text> : null}
          </View>
        </View>

        {/* Message Preview Snippet (1 single line) */}
        <View style={styles.previewRow}>
          <Text
            style={[
              styles.snippetText,
              unreadCount > 0 && styles.unreadSnippetText,
            ]}
            numberOfLines={1}
          >
            {previewSnippet}
          </Text>

          {/* Unread Badge / Status indicators */}
          <View style={styles.statusIcons}>
            {isMuted && (
              <BellOff size={13} color="#94A3B8" style={{ marginRight: 4 }} />
            )}
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : isDM && workspace.last_message ? (
              isLastMessageMine ? (
                isOtherUserRead ? (
                  <CheckCheck size={16} color="#10B981" strokeWidth={2.2} />
                ) : (
                  <CheckCheck size={16} color="#94A3B8" strokeWidth={2} />
                )
              ) : null
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unreadContainer: {
    backgroundColor: '#FFFFFF',
  },
  avatarWrapper: {
    marginRight: 14,
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snippetText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 18,
    flex: 1,
    marginRight: 8,
  },
  unreadSnippetText: {
    fontWeight: '400',
    color: '#475569',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pinnedContainer: {
    backgroundColor: '#F8FAF9',
  },
  pinnedBadgeIcon: {
    marginRight: 5,
    transform: [{ rotate: '45deg' }],
  },
  pinnedNameText: {
    color: '#0F172A',
  },
  timestampCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadBadge: {
    backgroundColor: '#064E3B',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presenceDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#15803D',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },
});
