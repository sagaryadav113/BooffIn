// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN HEADER BAR (LIGHT SAAS METIS STYLE)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminBadge } from './AdminBadge';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Search, Bell, Sun, Maximize2, LogOut, ShieldCheck, User } from 'lucide-react-native';

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

  const getInitials = () => {
    if (!email) return 'AD';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.header}>
      {/* 1. Left Title / Breadcrumb */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* 2. Center Global Search Input */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search... (Ctrl+K)"
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* 3. Right Utility Tools & User Identity */}
      <View style={styles.rightSection}>
        {/* Quick Tools */}
        <TouchableOpacity style={styles.iconButton}>
          <Sun size={17} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Maximize2 size={16} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton}>
          <Bell size={17} color="#64748B" />
          <View style={styles.notificationDot} />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Badges */}
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

        {/* User Avatar & Info */}
        <View style={styles.userProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {email ? email.split('@')[0] : 'Admin'}
            </Text>
            <Text style={styles.userSubtext}>Super Admin</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <LogOut size={15} color="#64748B" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    zIndex: 10,
  },
  titleContainer: {
    minWidth: 140,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 340,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
    outlineStyle: 'none' as any,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    maxWidth: 130,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  userSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginLeft: 6,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
