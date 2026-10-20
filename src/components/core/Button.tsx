import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout, useColors, useIsDark } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconRight?: React.ReactNode;
  iconLeft?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  iconRight,
  iconLeft,
}) => {
  const colors = useColors();
  const isDark = useIsDark();

  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore on platforms without haptics
    }
    onPress();
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.primaryContainer, isDark && { backgroundColor: '#10B981' }];
      case 'secondary':
        return [styles.secondaryContainer, isDark && { backgroundColor: colors.backgroundSecondary }];
      case 'outline':
        return [
          styles.outlineContainer,
          isDark && {
            borderColor: colors.border,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        ];
      case 'ghost':
        return styles.ghostContainer;
      case 'danger':
        return [styles.dangerContainer, isDark && { backgroundColor: colors.accentRed }];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return [styles.primaryText, isDark && { color: '#FFFFFF' }];
      case 'secondary':
        return [styles.secondaryText, isDark && { color: colors.textPrimary }];
      case 'outline':
        return [styles.outlineText, isDark && { color: colors.textPrimary }];
      case 'ghost':
        return [styles.ghostText, isDark && { color: colors.textPrimary }];
      case 'danger':
        return [styles.dangerText, isDark && { color: colors.white }];
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.smSize;
      case 'md':
        return styles.mdSize;
      case 'lg':
        return styles.lgSize;
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      activeOpacity={0.82}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
        style,
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'danger'
              ? colors.white
              : isDark
              ? colors.textPrimary
              : colors.black
          }
        />
      ) : (
        <>
          {iconLeft}
          <Text
            style={[
              getTextStyle(),
              textStyle,
              iconLeft ? { marginLeft: spacing.xs + 2 } : null,
              iconRight ? { marginRight: spacing.xs + 2 } : null,
            ]}
          >
            {title}
          </Text>
          {iconRight}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smSize: {
    minHeight: layout.buttonHeights.sm,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs,
  },
  mdSize: {
    minHeight: layout.buttonHeights.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  lgSize: {
    minHeight: layout.buttonHeights.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  primaryContainer: {
    backgroundColor: colors.black,
  },
  primaryText: {
    ...typography.labelBold,
    color: colors.white,
    fontSize: 14.5,
  },
  secondaryContainer: {
    backgroundColor: colors.backgroundTertiary,
  },
  secondaryText: {
    ...typography.labelBold,
    color: colors.textPrimary,
    fontSize: 14.5,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  outlineText: {
    ...typography.labelBold,
    color: colors.textPrimary,
    fontSize: 14.5,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    ...typography.labelBold,
    color: colors.textPrimary,
    fontSize: 14.5,
  },
  dangerContainer: {
    backgroundColor: colors.accentRed,
  },
  dangerText: {
    ...typography.labelBold,
    color: colors.white,
    fontSize: 14.5,
  },
  disabled: {
    opacity: 0.45,
  },
});
