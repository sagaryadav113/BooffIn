// ============================================================================
// BOOFFIN ADMIN PORTAL — ENTERPRISE TOP HEADER BAR
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { Search, LogOut, ChevronDown, Menu } from 'lucide-react-native';
import { AdminProfileModal } from './AdminProfileModal';
import { adminProfileService, SuperAdminProfileData } from '../services/adminProfileService';

interface AdminHeaderProps {
  title: string;
  isMobile?: boolean;
  onOpenMenu?: () => void;
  onNavigateProfile?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  isMobile,
  onOpenMenu,
  onNavigateProfile,
}) => {
  const { email, signOut } = useAdminAuth();
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profile, setProfile] = useState<SuperAdminProfileData | null>(null);

  const fetchProfile = async () => {
    const res = await adminProfileService.getProfile();
    if (res.profile) {
      setProfile(res.profile);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [email]);

  const getInitials = () => {
    if (profile?.fullName) {
      const parts = profile.fullName.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return profile.fullName.substring(0, 2).toUpperCase();
    }
    if (email) return email.substring(0, 2).toUpperCase();
    return 'SA';
  };

  const displayName = profile?.fullName || (email ? email.split('@')[0] : 'Super Admin');
  const displayRole = profile?.role === 'SUPER_ADMIN' ? 'Super Admin' : (profile?.role || 'Admin');

  const handleProfileClick = () => {
    if (onNavigateProfile) {
      onNavigateProfile();
    } else {
      setShowProfileModal(true);
    }
  };

  const isMac = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

  return (
    <>
      <View style={[styles.header, isMobile && styles.mobileHeader]}>
        {/* 1. Left Title / Mobile Drawer Trigger */}
        <View style={styles.titleContainer}>
          {isMobile && onOpenMenu && (
            <TouchableOpacity style={styles.menuBtn} onPress={onOpenMenu} activeOpacity={0.7}>
              <Menu size={18} color={ADMIN_COLORS.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, isMobile && styles.mobileTitle]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* 2. Center Global Search Box with Keyboard Shortcut */}
        {!isMobile && (
          <View style={styles.searchContainer}>
            <Search size={14} color={ADMIN_COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search researchers, audit logs, or queues..."
              placeholderTextColor={ADMIN_COLORS.textMuted}
            />
            <View style={styles.kbdBadge}>
              <Text style={styles.kbdText}>{isMac ? '⌘K' : 'Ctrl+K'}</Text>
            </View>
          </View>
        )}

        {/* 3. Right User Identity & Fast Action */}
        <View style={styles.rightSection}>
          {/* User Profile Trigger Button */}
          <TouchableOpacity
            style={[styles.userProfileBtn, isMobile && styles.mobileUserProfileBtn]}
            onPress={handleProfileClick}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
              <View style={styles.avatarStatusDot} />
            </View>
            {!isMobile && (
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.userSubtext}>{displayRole}</Text>
              </View>
            )}
            <ChevronDown size={13} color={ADMIN_COLORS.textMuted} style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {/* Quick Sign Out Button */}
          {!isMobile && (
            <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.7}>
              <LogOut size={14} color={ADMIN_COLORS.textSecondary} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Super Admin Profile Modal */}
      <AdminProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSignOut={signOut}
        onProfileUpdated={(updated) => {
          setProfile(updated);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  mobileHeader: {
    height: 48,
    paddingHorizontal: 12,
  },
  titleContainer: {
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    padding: 6,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  mobileTitle: {
    fontSize: 15,
    maxWidth: 160,
  },
  searchContainer: {
    flex: 1,
    maxWidth: 360,
    height: 34,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.input,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 16,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: ADMIN_COLORS.textPrimary,
    padding: 0,
    outlineStyle: 'none' as any,
  },
  kbdBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  kbdText: {
    fontSize: 10,
    fontWeight: '600',
    color: ADMIN_COLORS.textMuted,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  mobileUserProfileBtn: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ADMIN_COLORS.emeraldPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ADMIN_COLORS.emeraldLight,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    maxWidth: 130,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    lineHeight: 14,
  },
  userSubtext: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
    lineHeight: 12,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: ADMIN_RADII.button,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  signOutText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
  },
});
