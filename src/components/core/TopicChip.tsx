import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radii, spacing } from '../../theme';
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
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={!onPress}
      style={[
        styles.base,
        size === 'sm' ? styles.smSize : styles.mdSize,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
    >
      <Typography
        variant={size === 'sm' ? 'micro' : 'captionMedium'}
        color={selected ? colors.white : colors.textSecondary}
        style={selected && { fontWeight: '700' }}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 3,
  },
  smSize: {
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
});
