import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { colors, radii, spacing } from '../../theme';
import { AppNotification } from '../../types';
import { Avatar } from '../core/Avatar';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';

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
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (notification.targetPost) {
      router.push({
        pathname: '/post/[id]',
        params: { id: notification.targetPost.id },
      });
    } else if (notification.targetPaper) {
      router.push({
        pathname: '/paper/[id]',
        params: { id: notification.targetPaper.id },
      });
    } else {
      router.push({
        pathname: '/profile/[id]',
        params: { id: notification.actor.id },
      });
    }
  };

  const getEventBadge = (): { icon: IconName; bg: string } => {
    switch (notification.type) {
      case 'like':
        return { icon: 'Heart', bg: colors.accentRed };
      case 'comment':
        return { icon: 'MessageCircle', bg: colors.accentBlue };
      case 'repost':
        return { icon: 'Repeat2', bg: colors.accentGreen };
      case 'follow':
        return { icon: 'User', bg: colors.black };
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
          size={42}
          verified={notification.actor.orcidVerified}
        />
        <View style={[styles.badgeCircle, { backgroundColor: badge.bg }]}>
          <Icon name={badge.icon} size="xs" color={colors.white} />
        </View>
      </View>

      <View style={styles.content}>
        <Typography variant="caption" color={colors.textPrimary} style={styles.messageText}>
          <Typography variant="captionBold" color={colors.textPrimary}>
            {notification.actor.fullName}{' '}
          </Typography>
          {notification.content}
        </Typography>
        <Typography variant="micro" color={colors.textMuted} style={styles.timeText}>
          {notification.createdAt}
        </Typography>
      </View>

      <View style={styles.rightAction}>
        <Icon name="MoreHorizontal" size="xs" color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  unread: {
    backgroundColor: '#FAFAFA',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  badgeCircle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
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
    lineHeight: 19,
  },
  timeText: {
    marginTop: 2,
  },
  rightAction: {
    paddingLeft: spacing.sm,
  },
});
