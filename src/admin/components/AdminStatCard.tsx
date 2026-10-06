// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE SAAS KPI STAT CARD
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
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

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  subtext,
  trend,
  trendPositive = true,
  iconName,
  onPress,
  style,
}) => {
  const IconComponent = iconName && (Icons[iconName] as any) ? (Icons[iconName] as any) : null;

  const content = (
    <View style={styles.cardContent}>
      {/* Top Row: Label uppercase on left + Status/Trend tag on right */}
      <View style={styles.topRow}>
        <View style={styles.labelGroup}>
          {IconComponent && (
            <IconComponent size={14} color={ADMIN_COLORS.textSecondary} strokeWidth={2} style={{ marginRight: 6 }} />
          )}
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
        </View>

        {trend ? (
          <View style={[styles.trendBadge, trendPositive ? styles.trendBadgeSuccess : styles.trendBadgeWarning]}>
            <View style={[styles.trendDot, trendPositive ? styles.trendDotSuccess : styles.trendDotWarning]} />
            <Text style={[styles.trendText, trendPositive ? styles.trendTextSuccess : styles.trendTextWarning]}>
              {trend}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Metric Value */}
      <Text style={styles.value} numberOfLines={1}>{value}</Text>

      {/* Optional Metadata / Subtext */}
      {subtext ? <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text> : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.cardInteractive, style]}
        onPress={onPress}
        activeOpacity={0.8}
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
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardInteractive: {
    borderColor: ADMIN_COLORS.border,
  },
  cardContent: {
    flexDirection: 'column',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: ADMIN_RADII.badge,
    borderWidth: 1,
    gap: 4,
  },
  trendBadgeSuccess: {
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderColor: ADMIN_COLORS.statusSuccessBorder,
  },
  trendBadgeWarning: {
    backgroundColor: ADMIN_COLORS.statusWarningBg,
    borderColor: ADMIN_COLORS.statusWarningBorder,
  },
  trendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  trendDotSuccess: {
    backgroundColor: ADMIN_COLORS.statusSuccessDot,
  },
  trendDotWarning: {
    backgroundColor: ADMIN_COLORS.statusWarningDot,
  },
  trendText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  trendTextSuccess: {
    color: ADMIN_COLORS.statusSuccessText,
  },
  trendTextWarning: {
    color: ADMIN_COLORS.statusWarningText,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 32,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  subtext: {
    fontSize: 11.5,
    color: ADMIN_COLORS.textMuted,
    fontWeight: '400',
    marginTop: 2,
  },
});


