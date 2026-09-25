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
import { colors, radii, spacing, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
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
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        getContainerStyle(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.black}
        />
      ) : (
        <>
          {iconLeft}
          <Text style={[getTextStyle(), textStyle, iconLeft ? { marginLeft: spacing.xs } : null, iconRight ? { marginRight: spacing.xs } : null]}>
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
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  mdSize: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
  },
  lgSize: {
    minHeight: 50,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  primaryContainer: {
    backgroundColor: colors.black,
  },
  primaryText: {
    ...typography.captionBold,
    color: colors.white,
  },
  secondaryContainer: {
    backgroundColor: colors.backgroundTertiary,
  },
  secondaryText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  outlineText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    ...typography.captionBold,
    color: colors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
});
