// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN BADGE PILL (LIGHT SAAS THEME)
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
        return { bg: '#DEF7EC', border: '#BCF0DA', text: '#03543F' };
      case 'danger':
        return { bg: '#FDE8E8', border: '#FBD5D5', text: '#9B1C1C' };
      case 'warning':
        return { bg: '#FEF08A', border: '#FDE047', text: '#713F12' };
      case 'info':
        return { bg: '#E1EFFE', border: '#C3DDFD', text: '#1E429F' };
      default:
        return { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569' };
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
    borderRadius: 9999,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 11,
  },
});
