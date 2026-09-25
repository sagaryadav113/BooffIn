import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';

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
        return styles.primaryContainer;
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'danger':
        return styles.dangerContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      case 'danger':
        return styles.dangerText;
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
        style,
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.black}
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
