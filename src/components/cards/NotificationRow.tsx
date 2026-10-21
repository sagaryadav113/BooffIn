import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, layout, typography, useTheme } from '../../theme';
import { AppNotification } from '../../types/notification';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';
import { getNotificationDeepLink } from '../../api/notificationService';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { acceptFollowRequest, declineFollowRequest } from '../../api/socialService';

export interface NotificationRowProps {
  notification: AppNotification;
  onPress?: () => void;
  style?: ViewStyle;
}

export const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  onPress,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const currentUser = useAuthStore((s) => s.user);
  const refreshCurrentUserProfile = useAuthStore((s) => s.refreshCurrentUserProfile);
  const isFollowingActor = useAuthStore((s) => s.followingIds.has(notification.actor.id));
  const isFollowerActor = useAuthStore((s) => s.followerIds.has(notification.actor.id));
  const isRequestedActor = useAuthStore((s) => s.requestedUserIds.has(notification.actor.id));
  const isFollowLoading = useAuthStore((s) => s.followLoadingIds.has(notification.actor.id));
  const toggleFollowUser = useAuthStore((s) => s.toggleFollowUser);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'accepting' | 'accepted' | 'declining' | 'declined'>('idle');

  const handlePress = () => {
    // Automatically mark as read on tap
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (onPress) {
      onPress();
      return;
    }

    const { pathname, params } = getNotificationDeepLink(notification);
    router.push({
      pathname: pathname as any,
      params,
    });
  };

  const handleFollowBack = async (e: any) => {
    e?.stopPropagation?.();
    if (isFollowLoading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    markAsRead(notification.id);
    await toggleFollowUser(notification.actor.id);
  };

  const handleAcceptRequest = async (e: any) => {
    e?.stopPropagation?.();
    if (requestStatus !== 'idle') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setRequestStatus('accepting');
    markAsRead(notification.id);
    const res = await acceptFollowRequest(notification.actor.id, currentUser?.id);
    if (res.success) {
      setRequestStatus('accepted');
      // Immediately reflect actor in followerIds so follower/follow back states synchronize across all screens
      useAuthStore.setState((s) => {
        const nextFollowers = new Set(s.followerIds);
        nextFollowers.add(notification.actor.id);
        return {
          followerIds: nextFollowers,
          user: s.user ? { ...s.user, followersCount: (s.user.followersCount || 0) + 1 } : s.user,
        };
      });
      refreshCurrentUserProfile();
    } else {
      console.warn('[NotificationRow] acceptFollowRequest failed:', res.error);
      setRequestStatus('idle');
    }
  };

  const handleDeclineRequest = async (e: any) => {
    e?.stopPropagation?.();
    if (requestStatus !== 'idle') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setRequestStatus('declining');
    markAsRead(notification.id);
    const res = await declineFollowRequest(notification.actor.id, currentUser?.id);
    if (res.success) {
      setRequestStatus('declined');
    } else {
      setRequestStatus('idle');
    }
  };

  const getEventBadge = (): { icon: IconName; bg: string } => {
    switch (notification.type) {
      case 'like':
        return { icon: 'Heart', bg: colors.accentRed };
      case 'comment':
      case 'reply':
        return { icon: 'Discussion', bg: colors.accentBlue };
      case 'mention':
        return { icon: 'AtSign', bg: '#2563EB' };
      case 'collaboration_request':
        return { icon: 'Users', bg: '#0D9488' };
      case 'repost':
        return { icon: 'Repeat2', bg: colors.accentGreen };
      case 'follow':
        return { icon: 'User', bg: colors.black };
      case 'follow_request':
        return { icon: 'UserPlus', bg: colors.black };
      case 'follow_accept':
        return { icon: 'Check', bg: colors.accentGreen };
      case 'paper_discussion':
        return { icon: 'FileText', bg: '#8B5CF6' };
      case 'researcher_post':
        return { icon: 'Sparkles', bg: colors.accentGreen };
      case 'topic_activity':
        return { icon: 'Tag', bg: colors.accentOrange };
      case 'trending':
        return { icon: 'Zap', bg: colors.accentOrange };
      case 'workspace_invitation':
        return { icon: 'Layers', bg: '#4F46E5' };
      case 'workspace_message':
        return { icon: 'MessageSquare', bg: '#0284C7' };
      case 'workspace_event':
        return { icon: 'Calendar', bg: '#D97706' };
      default:
        return { icon: 'FileText', bg: colors.textSecondary };
    }
  };

  const badge = getEventBadge();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[
        styles.container,
        {
          backgroundColor: notification.isRead
            ? colors.backgroundCard
            : isDark
            ? '#111622'
            : '#F8FAFC',
          borderBottomColor: colors.borderLight,
        },
        style,
      ]}
    >
      <View style={styles.avatarWrapper}>
        <Avatar
          url={notification.actor.avatarUrl}
          name={notification.actor.fullName}
          size="md"
          verified={notification.actor.orcidVerified}
        />
        <View style={[styles.badgeCircle, { backgroundColor: badge.bg, borderColor: colors.backgroundCard }]}>
          <Icon name={badge.icon} size="xs" color={isDark && badge.bg === colors.white ? colors.black : colors.white} />
        </View>
      </View>

      <View style={styles.content}>
        <Typography variant="body" color={colors.textPrimary} style={styles.messageText}>
          <Typography variant="bodyBold" color={colors.textPrimary} style={styles.actorName}>
            {notification.actor.fullName}{' '}
          </Typography>
          {notification.content}
        </Typography>

        {/* Action Buttons for Follow Request */}
        {notification.type === 'follow_request' && (
          <View style={styles.requestActionsRow}>
            {requestStatus === 'declined' ? (
              <View style={styles.resolvedTag}>
                <Typography variant="metadata" color={colors.textMuted}>
                  Request removed
                </Typography>
              </View>
            ) : requestStatus === 'accepted' || isFollowerActor ? (
              isFollowingActor ? (
                <View style={[styles.followingPill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Typography variant="captionBold" color={colors.textSecondary}>
                    Following
                  </Typography>
                </View>
              ) : isRequestedActor ? (
                <View style={[styles.followingPill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Typography variant="captionBold" color={colors.textSecondary}>
                    Requested
                  </Typography>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.followBackBtn, { backgroundColor: colors.primary }]}
                  onPress={handleFollowBack}
                  disabled={isFollowLoading}
                >
                  {isFollowLoading ? (
                    <ActivityIndicator size="small" color={isDark ? colors.black : colors.white} />
                  ) : (
                    <Typography variant="captionBold" color={isDark ? colors.black : colors.white}>
                      Follow Back
                    </Typography>
                  )}
                </TouchableOpacity>
              )
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAcceptRequest}
                  disabled={requestStatus !== 'idle'}
                >
                  {requestStatus === 'accepting' ? (
                    <ActivityIndicator size="small" color={isDark ? colors.black : colors.white} />
                  ) : (
                    <Typography variant="captionBold" color={isDark ? colors.black : colors.white}>
                      Confirm
                    </Typography>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.deleteBtn,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleDeclineRequest}
                  disabled={requestStatus !== 'idle'}
                >
                  {requestStatus === 'declining' ? (
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                  ) : (
                    <Typography variant="captionBold" color={colors.textPrimary}>
                      Delete
                    </Typography>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Quick Follow Back Button for Follow Notifications */}
        {notification.type === 'follow' && notification.actor?.id && notification.actor.id !== currentUser?.id && (
          <View style={styles.requestActionsRow}>
            {isFollowingActor ? (
              <View style={[styles.followingPill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Typography variant="captionBold" color={colors.textSecondary}>
                  Following
                </Typography>
              </View>
            ) : isRequestedActor ? (
              <View style={[styles.followingPill, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Typography variant="captionBold" color={colors.textSecondary}>
                  Requested
                </Typography>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.followBackBtn, { backgroundColor: colors.primary }]}
                onPress={handleFollowBack}
                disabled={isFollowLoading}
              >
                {isFollowLoading ? (
                  <ActivityIndicator size="small" color={isDark ? colors.black : colors.white} />
                ) : (
                  <Typography variant="captionBold" color={isDark ? colors.black : colors.white}>
                    Follow Back
                  </Typography>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <Typography variant="metadata" color={colors.textMuted} style={styles.timeText}>
          {notification.createdAt}
        </Typography>
      </View>

      <View style={styles.rightAction}>
        {!notification.isRead && <View style={styles.unreadDot} />}
        <Icon name="ArrowUpRight" size="xs" color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    minHeight: layout.touchTargetMin + 16,
  },
  unread: {
    backgroundColor: '#F8FAFC',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  badgeCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  content: {
    flex: 1,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  actorName: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  timeText: {
    marginTop: 3,
    fontSize: 12.5,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm,
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.accentBlue,
  },
  requestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
    marginBottom: 2,
  },
  confirmBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    minHeight: 28,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    minHeight: 28,
    minWidth: 65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedTag: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
  },
  followBackBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    minHeight: 28,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingPill: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
});
