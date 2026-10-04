// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN STAT CARD (LIGHT SAAS THEME)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import * as Icons from 'lucide-react-native';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  trendPositive?: boolean;
  iconName?: keyof typeof Icons;
  variant?: 'default' | 'emerald' | 'warning' | 'danger' | 'info';
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  subtext,
  trend,
  trendPositive = true,
  iconName,
  variant = 'default',
}) => {
  // Resolve Lucide Icon
  const IconComponent = iconName && (Icons[iconName] as any) ? (Icons[iconName] as any) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {IconComponent ? (
          <View style={styles.iconBox}>
            <IconComponent size={20} color={ADMIN_COLORS.emeraldDark} />
          </View>
        ) : null}

        <View style={styles.textContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
          
          <View style={styles.footerRow}>
            {trend ? (
              <View style={styles.trendRow}>
                <Text style={[styles.trendText, trendPositive ? styles.trendUp : styles.trendDown]}>
                  {trend}
                </Text>
              </View>
            ) : null}
            {subtext ? <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trendUp: {
    color: '#059669',
  },
  trendDown: {
    color: '#EF4444',
  },
  subtext: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
