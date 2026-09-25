import React from 'react';
import { View, StyleSheet, Switch, Platform } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Typography } from '../core/Typography';
import { Icon, IconName } from '../core/Icon';

interface ToggleRowProps {
  icon?: IconName;
  iconColor?: string;
  iconBgColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      {icon ? (
        <View style={[styles.iconCircle, { backgroundColor: iconBgColor || colors.backgroundSecondary }]}>
          <Icon
            name={icon}
            size={20}
            color={iconColor || colors.textPrimary}
          />
        </View>
      ) : null}

      <View style={styles.metaContainer}>
        <Typography variant="bodyBold" color={colors.textPrimary} style={styles.title}>
          {title}
        </Typography>

        {subtitle ? (
          <Typography variant="caption" color={colors.textSecondary} style={styles.subtitle}>
            {subtitle}
          </Typography>
        ) : null}
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: Platform.OS === 'web' ? '#E2E8F0' : colors.borderLight,
          true: colors.black,
        }}
        thumbColor={Platform.OS === 'ios' ? undefined : colors.white}
        ios_backgroundColor={colors.borderLight}
      />
    </View>
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
    paddingRight: spacing.md,
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
});
