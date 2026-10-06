// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE SIDEBAR NAVIGATION
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ADMIN_COLORS, ADMIN_NAV_GROUPS, AdminNavKey, ADMIN_RADII } from '../lib/constants';
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
  User,
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
  User,
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
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>v1.0 Prod</Text>
          </View>
        </View>

        {isMobileDrawer && onClose && (
          <TouchableOpacity style={styles.closeDrawerBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={18} color={ADMIN_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Structured Grouped Navigation */}
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {ADMIN_NAV_GROUPS.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) =>
            !item.permission || hasPermission(item.permission as AdminPermission)
          );

          if (visibleItems.length === 0) return null;

          return (
            <View key={group.category} style={[styles.navGroup, gIdx > 0 && styles.navGroupSpaced]}>
              <Text style={styles.sectionHeader}>{group.category}</Text>

              {visibleItems.map((item) => {
                const isActive = activeKey === item.key;
                const IconComponent = NAV_ICON_MAP[item.icon] || LayoutDashboard;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.navItem,
                      isActive && styles.navItemActive,
                    ]}
                    onPress={() => onSelect(item.key as AdminNavKey)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.navItemLeft}>
                      <IconComponent
                        size={16}
                        color={isActive ? ADMIN_COLORS.emeraldPrimary : ADMIN_COLORS.textSecondary}
                        strokeWidth={isActive ? 2.4 : 1.8}
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
                      <View style={styles.badgeTag}>
                        <Text style={styles.badgeTagText}>AAL2</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* 3. Footer Environment Indicator */}
      <View style={styles.footer}>
        <View style={styles.statusDot} />
        <View style={styles.footerTextContainer}>
          <Text style={styles.footerTitle}>Production Gateway</Text>
          <Text style={styles.footerSubtitle}>Realtime Postgres TLS</Text>
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
    borderRightColor: ADMIN_COLORS.border,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  mobileSidebar: {
    width: '100%',
    height: '100%',
    borderRightWidth: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  brandLogoWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoImage: {
    width: 130,
    height: 24,
  },
  versionBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: ADMIN_RADII.badge,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  versionBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  closeDrawerBtn: {
    padding: 6,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#F1F5F9',
  },
  navList: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 14,
  },
  navGroup: {
    marginBottom: 16,
  },
  navGroupSpaced: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: ADMIN_COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: ADMIN_RADII.button,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: ADMIN_COLORS.bgActive,
    borderLeftWidth: 3,
    borderLeftColor: ADMIN_COLORS.emeraldPrimary,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navLabel: {
    fontSize: 13,
  },
  navLabelActive: {
    color: ADMIN_COLORS.emeraldPrimary,
    fontWeight: '700',
  },
  navLabelInactive: {
    color: ADMIN_COLORS.textSecondary,
    fontWeight: '500',
  },
  badgeTag: {
    backgroundColor: ADMIN_COLORS.statusSuccessBg,
    borderColor: ADMIN_COLORS.statusSuccessBorder,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: ADMIN_RADII.badge,
  },
  badgeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: ADMIN_COLORS.statusSuccessText,
    letterSpacing: 0.4,
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ADMIN_COLORS.emeraldLight,
  },
  footerTextContainer: {
    flex: 1,
  },
  footerTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  footerSubtitle: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
  },
});
