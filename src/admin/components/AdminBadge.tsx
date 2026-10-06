// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE STATUS BADGE
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';

export type AdminBadgeVariant = 'emerald' | 'danger' | 'warning' | 'info' | 'neutral';

interface AdminBadgeProps {
  label: string;
  variant?: AdminBadgeVariant;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const AdminBadge: React.FC<AdminBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  showDot = true,
}) => {
  const getStyleTokens = () => {
    switch (variant) {
      case 'emerald':
        return {
          bg: ADMIN_COLORS.statusSuccessBg,
          border: ADMIN_COLORS.statusSuccessBorder,
          text: ADMIN_COLORS.statusSuccessText,
          dot: ADMIN_COLORS.statusSuccessDot,
        };
      case 'danger':
        return {
          bg: ADMIN_COLORS.statusDangerBg,
          border: ADMIN_COLORS.statusDangerBorder,
          text: ADMIN_COLORS.statusDangerText,
          dot: ADMIN_COLORS.statusDangerDot,
        };
      case 'warning':
        return {
          bg: ADMIN_COLORS.statusWarningBg,
          border: ADMIN_COLORS.statusWarningBorder,
          text: ADMIN_COLORS.statusWarningText,
          dot: ADMIN_COLORS.statusWarningDot,
        };
      case 'info':
        return {
          bg: ADMIN_COLORS.statusInfoBg,
          border: ADMIN_COLORS.statusInfoBorder,
          text: ADMIN_COLORS.statusInfoText,
          dot: ADMIN_COLORS.statusInfoDot,
        };
      default:
        return {
          bg: ADMIN_COLORS.statusNeutralBg,
          border: ADMIN_COLORS.statusNeutralBorder,
          text: ADMIN_COLORS.statusNeutralText,
          dot: ADMIN_COLORS.statusNeutralDot,
        };
    }
  };

  const tokens = getStyleTokens();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: tokens.bg, borderColor: tokens.border },
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
      ]}
    >
      {showDot && <View style={[styles.dot, { backgroundColor: tokens.dot }]} />}
      <Text style={[styles.text, { color: tokens.text }, size === 'sm' ? styles.textSm : styles.textMd]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: ADMIN_RADII.badge,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    lineHeight: 12,
  },
  textMd: {
    fontSize: 11,
    lineHeight: 14,
  },
});

