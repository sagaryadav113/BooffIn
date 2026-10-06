// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN STAT CARD (MODERN SAAS & MOBILE APP THEME)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import * as Icons from 'lucide-react-native';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendPositive?: boolean;
  iconName?: keyof typeof Icons;
  variant?: 'default' | 'emerald' | 'warning' | 'danger' | 'info' | 'purple' | 'blue';
  onPress?: () => void;
  style?: ViewStyle;
}

const VARIANT_MAP = {
  default: { iconBg: '#F1F5F9', iconColor: '#059669', borderColor: '#E2E8F0' },
  emerald: { iconBg: '#ECFDF5', iconColor: '#059669', borderColor: '#D1FAE5' },
  blue: { iconBg: '#EFF6FF', iconColor: '#2563EB', borderColor: '#DBEAFE' },
  warning: { iconBg: '#FEF3C7', iconColor: '#D97706', borderColor: '#FDE68A' },
  danger: { iconBg: '#FEE2E2', iconColor: '#DC2626', borderColor: '#FECACA' },
  info: { iconBg: '#F0F9FF', iconColor: '#0284C7', borderColor: '#BAE6FD' },
  purple: { iconBg: '#F5F3FF', iconColor: '#7C3AED', borderColor: '#DDD6FE' },
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  subtext,
  trend,
  trendPositive = true,
  iconName,
  variant = 'default',
  onPress,
  style,
}) => {
  // Resolve Lucide Icon
  const IconComponent = iconName && (Icons[iconName] as any) ? (Icons[iconName] as any) : null;
  const vStyle = VARIANT_MAP[variant] || VARIANT_MAP.default;

  const content = (
    <View style={styles.cardContent}>
      <View style={styles.cardTopRow}>
        {IconComponent ? (
          <View style={[styles.iconBox, { backgroundColor: vStyle.iconBg, borderColor: vStyle.borderColor }]}>
            <IconComponent size={18} color={vStyle.iconColor} strokeWidth={2.2} />
          </View>
        ) : null}

        {trend ? (
          <View style={[styles.trendBadge, trendPositive ? styles.trendBadgeUp : styles.trendBadgeDown]}>
            <Text style={[styles.trendText, trendPositive ? styles.trendUp : styles.trendDown]}>
              {trend}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.value} numberOfLines={1}>{value}</Text>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {subtext ? <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardInteractive, style]}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInteractive: {
    borderColor: '#E2E8F0',
  },
  cardContent: {
    flexDirection: 'column',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trendBadgeUp: {
    backgroundColor: '#ECFDF5',
  },
  trendBadgeDown: {
    backgroundColor: '#FEF2F2',
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trendUp: {
    color: '#059669',
  },
  trendDown: {
    color: '#EF4444',
  },
  textContainer: {
    flexDirection: 'column',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  subtext: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

