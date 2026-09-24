import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii } from '../../theme';
import { Icon, IconName, IconSize } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
  iconSize?: IconSize;
  iconColor?: string;
  color?: string; // alias for iconColor
  variant?: 'ghost' | 'filled' | 'outline' | 'black';
  disabled?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  iconSize,
  iconColor,
  color,
  variant = 'ghost',
  disabled = false,
  style,
}) => {
  const handlePress = () => {
    if (disabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'filled':
        return styles.filled;
      case 'outline':
        return styles.outline;
      case 'black':
        return styles.black;
      default:
        return styles.ghost;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sm;
      case 'lg':
        return styles.lg;
      default:
        return styles.md;
    }
  };

  const getColor = () => {
    if (color) return color;
    if (iconColor) return iconColor;
    if (variant === 'black') return colors.white;
    return colors.textPrimary;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.base,
        getSizeStyle(),
        getVariantStyle(),
        disabled && styles.disabled,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon
        name={icon}
        size={iconSize || (size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm')}
        color={getColor()}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    width: 32,
    height: 32,
  },
  md: {
    width: 40,
    height: 40,
  },
  lg: {
    width: 48,
    height: 48,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  filled: {
    backgroundColor: colors.backgroundSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  black: {
    backgroundColor: colors.black,
  },
  disabled: {
    opacity: 0.4,
  },
});
