import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radii, spacing } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'outlined' | 'flat';
  onPress?: () => void;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'subtle':
        return styles.subtle;
      case 'outlined':
        return styles.outlined;
      case 'flat':
        return styles.flat;
      default:
        return styles.default;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.base, getVariantStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.base, getVariantStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  default: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subtle: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.backgroundTertiary,
  },
});
