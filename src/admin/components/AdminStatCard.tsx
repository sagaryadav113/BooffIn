// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN STAT CARD
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'emerald' | 'warning' | 'danger';
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  subtext,
  variant = 'default',
}) => {
  const getAccentColor = () => {
    switch (variant) {
      case 'emerald':
        return ADMIN_COLORS.emeraldLight;
      case 'warning':
        return ADMIN_COLORS.warning;
      case 'danger':
        return ADMIN_COLORS.danger;
      default:
        return ADMIN_COLORS.textPrimary;
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: getAccentColor() }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 200,
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 6,
  },
});
