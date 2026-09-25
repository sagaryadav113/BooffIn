import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';
import { Avatar } from '../core/Avatar';

interface SettingsRowProps {
  icon?: IconName;
  iconColor?: string;
  iconBgColor?: string;
  avatarUrl?: string;
  avatarFallback?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  showChevron?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconColor,
  iconBgColor,
  avatarUrl,
  avatarFallback,
  title,
  subtitle,
  value,
  onPress,
  rightElement,
  destructive = false,
  showChevron = true,
  disabled = false,
  style,
}) => {
  const isInteractive = Boolean(onPress) && !disabled;

  const defaultIconColor = destructive ? colors.error : colors.textPrimary;
  const defaultIconBg = destructive ? '#FEE2E2' : colors.backgroundSecondary;

  return (
    <TouchableOpacity
      activeOpacity={isInteractive ? 0.7 : 1}
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={[
        styles.container,
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Icon or Avatar */}
      {avatarUrl || avatarFallback ? (
        <View style={styles.avatarWrapper}>
          <Avatar
            uri={avatarUrl}
            name={avatarFallback || title}
            size="md"
          />
        </View>
      ) : icon ? (
        <View style={[styles.iconCircle, { backgroundColor: iconBgColor || defaultIconBg }]}>
          <Icon
            name={icon}
            size="sm"
            color={iconColor || defaultIconColor}
          />
        </View>
      ) : null}

      {/* Title & Subtitle */}
      <View style={styles.metaContainer}>
        <Typography
          variant="captionBold"
          color={destructive ? colors.error : colors.textPrimary}
          style={styles.title}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            variant="micro"
            color={colors.textSecondary}
            style={styles.subtitle}
          >
            {subtitle}
          </Typography>
        ) : null}
      </View>

      {/* Right Element, Value Badge, or Chevron */}
      <View style={styles.rightSection}>
        {value ? (
          <Typography
            variant="caption"
            color={colors.textSecondary}
            style={styles.valueText}
          >
            {value}
          </Typography>
        ) : null}

        {rightElement ? (
          rightElement
        ) : showChevron && isInteractive ? (
          <Icon name="ArrowRight" size="xs" color={colors.textMuted} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardBackground,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  avatarWrapper: {
    marginRight: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  valueText: {
    fontSize: 13,
    marginRight: spacing.xs,
  },
});
