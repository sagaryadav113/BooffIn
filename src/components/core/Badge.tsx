import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'nature' | 'science' | 'cell' | 'generic' | 'topic' | 'oa';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'generic', style }) => {
  const getColors = () => {
    switch (variant) {
      case 'nature':
        return { text: colors.journalNature, bg: 'rgba(220, 38, 38, 0.08)' };
      case 'science':
        return { text: colors.journalScience, bg: 'rgba(217, 119, 6, 0.08)' };
      case 'cell':
        return { text: colors.journalCell, bg: 'rgba(2, 132, 199, 0.08)' };
      case 'oa':
        return { text: colors.accentGreen, bg: 'rgba(16, 185, 129, 0.08)' };
      case 'topic':
        return { text: colors.textSecondary, bg: colors.backgroundTertiary };
      default:
        return { text: colors.textPrimary, bg: colors.backgroundSecondary };
    }
  };

  const c = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...typography.micro,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
