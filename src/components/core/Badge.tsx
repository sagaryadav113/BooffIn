import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radii, spacing, typography, useColors, useIsDark } from '../../theme';

interface BadgeProps {
  label: string;
  variant?: 'nature' | 'science' | 'cell' | 'generic' | 'topic' | 'oa' | 'closed';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'generic', style }) => {
  const colors = useColors();
  const isDark = useIsDark();

  const getColors = () => {
    switch (variant) {
      case 'nature':
        return { text: colors.journalNature, bg: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(220, 38, 38, 0.08)' };
      case 'science':
        return { text: colors.journalScience, bg: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.08)' };
      case 'cell':
        return { text: colors.journalCell, bg: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.08)' };
      case 'oa':
        return { text: colors.accentGreen, bg: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)' };
      case 'closed':
        return { text: isDark ? '#F87171' : '#DC2626', bg: isDark ? 'rgba(248, 113, 113, 0.15)' : 'rgba(220, 38, 38, 0.08)' };
      case 'topic':
        return { text: colors.textSecondary, bg: colors.backgroundTertiary };
      default:
        return { text: colors.textPrimary, bg: colors.backgroundSecondary };
    }
  };

  const c = getColors();
  const cleanedLabel = (label || '').replace(/\s*Breakthrough\s*Preprints/gi, '').trim();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.label, { color: c.text }]}>{cleanedLabel}</Text>
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
