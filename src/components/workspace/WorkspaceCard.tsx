import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Shield, Users, Lock, MessageSquare, CheckCircle2, Check, CheckCheck, Heart } from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { GroupCollageAvatar } from './GroupCollageAvatar';
import { Workspace } from '../../types/workspace';

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
  const handlePress = () => {
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

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '12:34 PM';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '12:34 PM';
    }
  };

  const timeText = formatTime(workspace.updated_at || workspace.created_at);

  const displayName = isDM
    ? workspace.other_user?.fullName || workspace.name || 'Researcher'
    : workspace.name;

  const previewSnippet =
    workspace.last_message?.content ||
    (isDM
      ? 'No messages yet'
      : workspace.description || 'Welcome to this workspace');

  // Determine read receipt state
  const isLastMessageMine = workspace.last_message?.sender_id && workspace.last_message?.sender_id !== workspace.other_user?.id;
  const isMessageRead = unreadCount === 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.container, unreadCount > 0 && styles.unreadContainer]}
    >
      {/* Left Avatar (48px) */}
      <View style={styles.avatarWrapper}>
        {isDM ? (
          <Avatar
            uri={workspace.other_user?.avatarUrl || workspace.avatar_url || undefined}
            name={displayName}
            size="md"
          />
        ) : isInnerCircle ? (
          <GroupCollageAvatar size={48} name={workspace.name} />
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
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          {/* Right Timestamp */}
          <Text style={styles.timeText}>{timeText}</Text>
        </View>

        {/* Message Preview Snippet (1 single line) */}
        <View style={styles.previewRow}>
          <Text style={styles.snippetText} numberOfLines={1}>
            {previewSnippet}
          </Text>

          {/* Unread Badge / Status indicators */}
          <View style={styles.statusIcons}>
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : isDM ? (
              isMessageRead ? (
                <CheckCheck size={16} color="#10B981" strokeWidth={2.2} />
              ) : (
                <CheckCheck size={16} color="#94A3B8" strokeWidth={2} />
              )
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
    fontWeight: '700',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snippetText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadBadge: {
    backgroundColor: '#164E3F',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
