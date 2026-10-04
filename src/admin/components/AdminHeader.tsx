// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN HEADER BAR (STAGE 2)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminBadge } from './AdminBadge';
import { useAdminAuth } from '../hooks/useAdminAuth';

interface AdminHeaderProps {
  title: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title }) => {
  const { email, role, aal, signOut } = useAdminAuth();

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'emerald';
      case 'ADMIN':
        return 'info';
      case 'MODERATOR':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.header}>
      {/* View Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Admin Identity, Role, MFA Status & Sign Out */}
      <View style={styles.rightSection}>
        <AdminBadge label="TEST ENV" variant="warning" size="sm" />

        {role ? (
          <AdminBadge label={role} variant={getRoleBadgeVariant()} size="sm" />
        ) : null}

        {aal ? (
          <AdminBadge
            label={aal.toUpperCase()}
            variant={aal === 'aal2' ? 'emerald' : 'warning'}
            size="sm"
          />
        ) : null}

        <View style={styles.userInfo}>
          <Text style={styles.userEmail} numberOfLines={1}>
            {email || 'Admin User'}
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: ADMIN_COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    maxWidth: 200,
  },
  userEmail: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    fontWeight: '500',
  },
  signOutBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 5,
  },
  signOutText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
