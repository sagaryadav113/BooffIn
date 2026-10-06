// ============================================================================
// BOOFFIN ADMIN PORTAL — SIDEBAR NAVIGATION (LIGHT SAAS METIS STYLE)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ADMIN_COLORS, ADMIN_NAV_ITEMS, AdminNavKey } from '../lib/constants';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { AdminPermission } from '../types/roles';
import {
  LayoutDashboard,
  Calendar,
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
  X,
} from 'lucide-react-native';

const NAV_ICON_MAP: Record<string, React.FC<any>> = {
  LayoutDashboard,
  Calendar,
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
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeKey,
  onSelect,
  onClose,
  isMobileDrawer,
}) => {
  const { hasPermission } = useAdminPermissions();

  return (
    <View style={[styles.sidebar, isMobileDrawer && styles.mobileSidebar]}>
      {/* 1. Brand Logo Header */}
      <View style={styles.brandContainer}>
        <View style={styles.brandLogoWrapper}>
          <Image
            source={require('../../../assets/images/booffin-admin-logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>

        {isMobileDrawer && onClose && (
          <TouchableOpacity style={styles.closeDrawerBtn} onPress={onClose}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        )}
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
  mobileSidebar: {
    width: '100%',
    height: '100%',
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 64,
  },
  brandLogoWrapper: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandLogoImage: {
    width: 175,
    height: 30,
  },
  closeDrawerBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
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
