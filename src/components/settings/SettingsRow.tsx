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
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
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
            size={20}
            color={iconColor || defaultIconColor}
          />
        </View>
      ) : null}

      {/* Title & Subtitle */}
      <View style={styles.metaContainer}>
        <Typography
          variant="bodyBold"
          color={destructive ? colors.error : colors.textPrimary}
          style={styles.title}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            variant="caption"
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
            variant="captionMedium"
            color={colors.textSecondary}
            style={styles.valueText}
          >
            {value}
          </Typography>
        ) : null}

        {rightElement ? (
          rightElement
        ) : showChevron && isInteractive ? (
          <Icon name="ArrowRight" size={16} color={colors.textMuted} />
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
    paddingHorizontal: spacing.lg,
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
    width: 38,
    height: 38,
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
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  valueText: {
    fontSize: 13.5,
    marginRight: spacing.xs,
  },
});
