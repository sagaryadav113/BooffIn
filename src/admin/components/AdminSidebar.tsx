// ============================================================================
// BOOFFIN ADMIN PORTAL — HIGH-DENSITY SIDEBAR NAVIGATION
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ADMIN_COLORS, ADMIN_NAV_ITEMS, AdminNavKey } from '../lib/constants';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { AdminPermission } from '../types/roles';

interface AdminSidebarProps {
  activeKey: AdminNavKey;
  onSelect: (key: AdminNavKey) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeKey,
  onSelect,
}) => {
  const { hasPermission } = useAdminPermissions();

  return (
    <View style={styles.sidebar}>
      {/* Brand Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>B</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>BooffIn</Text>
          <Text style={styles.brandSubtitle}>Admin Console v1.0</Text>
        </View>
      </View>

      {/* Navigation List */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Console Navigation</Text>
        {ADMIN_NAV_ITEMS.map((item) => {
          const isAllowed = !item.permission || hasPermission(item.permission as AdminPermission);
          const isActive = activeKey === item.key;

          if (!isAllowed) return null;

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
              ]}
              onPress={() => onSelect(item.key)}
            >
              <View style={[styles.navIndicator, isActive && styles.navIndicatorActive]} />
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>STAGE 1 TEST MODE</Text>
        <Text style={styles.footerSubtext}>DB: Supabase (Isolated)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: ADMIN_COLORS.bgSecondary,
    borderRightWidth: 1,
    borderRightColor: ADMIN_COLORS.borderSubtle,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    gap: 12,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  brandTitle: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  navList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 1,
  },
  navItemActive: {
    backgroundColor: ADMIN_COLORS.bgHover,
  },
  navIndicator: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginRight: 10,
  },
  navIndicatorActive: {
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  navLabelActive: {
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '600',
  },
  navLabelInactive: {
    color: ADMIN_COLORS.textSecondary,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    backgroundColor: ADMIN_COLORS.bgPrimary,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.warning,
    letterSpacing: 0.5,
  },
  footerSubtext: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
});
