import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Repeat2,
  UserPlus,
  TrendingUp,
  FileText,
  MoreHorizontal,
} from 'lucide-react-native';
import { AppNotification } from '../../types';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useNotificationStore } from '../../store/useNotificationStore';

interface NotificationCardProps {
  notification: AppNotification;
  style?: ViewStyle;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  style,
}) => {
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const handlePress = () => {
    markAsRead(notification.id);
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

  const getEventIcon = () => {
    const size = 12;
    switch (notification.type) {
      case 'like':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: colors.accentRed }]}>
            <Heart size={size} color={colors.white} fill={colors.white} />
          </View>
        );
      case 'comment':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: colors.accentLink }]}>
            <MessageCircle size={size} color={colors.white} />
          </View>
        );
      case 'repost':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: colors.accentGreen }]}>
            <Repeat2 size={size} color={colors.white} />
          </View>
        );
      case 'follow':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: colors.black }]}>
            <UserPlus size={size} color={colors.white} />
          </View>
        );
      case 'trending':
        return (
          <View style={[styles.badgeContainer, { backgroundColor: colors.accentOrange }]}>
            <TrendingUp size={size} color={colors.white} />
          </View>
        );
      default:
        return (
          <View style={[styles.badgeContainer, { backgroundColor: colors.textSecondary }]}>
            <FileText size={size} color={colors.white} />
          </View>
        );
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[
        styles.container,
        !notification.isRead && styles.unreadContainer,
        style,
      ]}
    >
      {/* Avatar with Event Badge */}
      <View style={styles.avatarWrapper}>
        <Avatar
          url={notification.actor.avatarUrl}
          name={notification.actor.fullName}
          size={42}
          verified={notification.actor.orcidVerified}
        />
        {getEventIcon()}
      </View>

      {/* Text Body */}
      <View style={styles.content}>
        <Text style={styles.messageText}>
          <Text style={styles.actorName}>{notification.actor.fullName} </Text>
          {notification.content}
        </Text>
        <Text style={styles.timestamp}>{notification.createdAt}</Text>
      </View>

      {/* More Options */}
      <TouchableOpacity
        style={styles.moreButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MoreHorizontal size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.cardBackground,
  },
  unreadContainer: {
    backgroundColor: '#FAFAFA',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  badgeContainer: {
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
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 19,
  },
  actorName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: 2,
  },
  moreButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
