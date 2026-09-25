import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing, layout, typography } from '../../theme';
import { AppNotification } from '../../types/notification';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';
import { getNotificationDeepLink } from '../../api/notificationService';
import { useNotificationStore } from '../../store/useNotificationStore';

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
  const markAsRead = useNotificationStore((s) => s.markAsRead);

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

  const getEventBadge = (): { icon: IconName; bg: string } => {
    switch (notification.type) {
      case 'like':
        return { icon: 'Heart', bg: colors.accentRed };
      case 'comment':
        return { icon: 'MessageCircle', bg: colors.accentBlue };
      case 'reply':
        return { icon: 'MessageSquare', bg: colors.accentBlue };
      case 'repost':
        return { icon: 'Repeat2', bg: colors.accentGreen };
      case 'follow':
        return { icon: 'User', bg: colors.black };
      case 'paper_discussion':
        return { icon: 'FileText', bg: '#8B5CF6' };
      case 'researcher_post':
        return { icon: 'Sparkles', bg: colors.accentGreen };
      case 'topic_activity':
        return { icon: 'Tag', bg: colors.accentOrange };
      case 'mention':
        return { icon: 'MessageCircle', bg: colors.accentBlue };
      case 'trending':
        return { icon: 'Zap', bg: colors.accentOrange };
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
        !notification.isRead && styles.unread,
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
        <View style={[styles.badgeCircle, { backgroundColor: badge.bg }]}>
          <Icon name={badge.icon} size="xs" color={colors.white} />
        </View>
      </View>

      <View style={styles.content}>
        <Typography variant="body" color={colors.textPrimary} style={styles.messageText}>
          <Typography variant="bodyBold" color={colors.textPrimary} style={styles.actorName}>
            {notification.actor.fullName}{' '}
          </Typography>
          {notification.content}
        </Typography>
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
});
