// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN BADGE COMPONENT
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';

interface AdminBadgeProps {
  label: string;
  variant?: 'emerald' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const AdminBadge: React.FC<AdminBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
}) => {
  const getColors = () => {
    switch (variant) {
      case 'emerald':
        return { bg: ADMIN_COLORS.emeraldBg, border: ADMIN_COLORS.emeraldBorder, text: ADMIN_COLORS.emeraldLight };
      case 'danger':
        return { bg: ADMIN_COLORS.dangerBg, border: ADMIN_COLORS.dangerBorder, text: ADMIN_COLORS.danger };
      case 'warning':
        return { bg: ADMIN_COLORS.warningBg, border: ADMIN_COLORS.warningBorder, text: ADMIN_COLORS.warning };
      case 'info':
        return { bg: ADMIN_COLORS.infoBg, border: ADMIN_COLORS.infoBorder, text: ADMIN_COLORS.info };
      default:
        return { bg: ADMIN_COLORS.bgHover, border: ADMIN_COLORS.borderSubtle, text: ADMIN_COLORS.textSecondary };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
      ]}
    >
      <Text style={[styles.text, { color: colors.text }, size === 'sm' ? styles.textSm : styles.textMd]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 11,
  },
});
