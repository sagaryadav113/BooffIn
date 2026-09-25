import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing, typography, layout } from '../../theme';
import { Typography } from './Typography';

export interface TopicChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const TopicChip: React.FC<TopicChipProps> = ({
  label,
  selected = false,
  onPress,
  size = 'md',
  style,
}) => {
  const handlePress = () => {
    if (!onPress) return;
    try {
      Haptics.selectionAsync();
    } catch {}
    onPress();
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Topic: ${label}`}
      accessibilityState={{ selected }}
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={!onPress}
      style={[
        styles.base,
        size === 'sm' ? styles.smSize : styles.mdSize,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Typography
        variant={size === 'sm' ? 'caption' : 'captionMedium'}
        color={selected ? colors.white : colors.textSecondary}
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          selected && styles.textSelected,
        ]}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mdSize: {
    minHeight: 36,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
  },
  smSize: {
    minHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  selected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  unselected: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  text: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  textSm: {
    fontSize: 12.5,
  },
  textSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});
