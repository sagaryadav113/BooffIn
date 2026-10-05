// ============================================================================
// BOOFFIN ADMIN PORTAL — SIDEBAR NAVIGATION (LIGHT SAAS METIS STYLE)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ADMIN_COLORS, ADMIN_NAV_ITEMS, AdminNavKey } from '../lib/constants';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { AdminPermission } from '../types/roles';
import {
  LayoutDashboard,
  Users,
  Flag,
  ShieldAlert,
  CheckSquare,
  UserCheck,
  FileText,
  ShieldCheck,
  TrendingUp,
  Activity,
  Settings,
  Sparkles,
  ChevronRight,
  LifeBuoy,
  MessagesSquare,
} from 'lucide-react-native';

const NAV_ICON_MAP: Record<string, React.FC<any>> = {
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  Users,
  Flag,
  ShieldAlert,
  CheckSquare,
  UserCheck,
  FileText,
  ShieldCheck,
  TrendingUp,
  Activity,
  Settings,
};

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
      {/* 1. Brand Logo Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>B</Text>
        </View>
        <View style={styles.brandTextGroup}>
          <Text style={styles.brandTitle}>BooffIn</Text>
          <Text style={styles.brandSubtitle}>Admin Console</Text>
        </View>
      </View>

      {/* 2. Navigation Items List */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Console Navigation</Text>

        {ADMIN_NAV_ITEMS.map((item) => {
          const isAllowed = !item.permission || hasPermission(item.permission as AdminPermission);
          const isActive = activeKey === item.key;
          const IconComponent = NAV_ICON_MAP[item.icon] || LayoutDashboard;

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
              <View style={styles.navItemLeft}>
                <IconComponent
                  size={18}
                  color={isActive ? '#059669' : '#64748B'}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <Text
                  style={[
                    styles.navLabel,
                    isActive ? styles.navLabelActive : styles.navLabelInactive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>

              {item.key === 'security' ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>AAL2</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. Footer Environment Indicator */}
      <View style={styles.footer}>
        <View style={styles.statusDot} />
        <View style={styles.footerTextContainer}>
          <Text style={styles.footerTitle}>Production Connected</Text>
          <Text style={styles.footerSubtitle}>BooffIn Security v1.0</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  logoBadgeText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandTextGroup: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.2,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#ECFDF5',
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLabel: {
    fontSize: 13,
  },
  navLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
  navLabelInactive: {
    color: '#475569',
    fontWeight: '500',
  },
  badgePill: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#03543F',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  footerTextContainer: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
});
