// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN HEADER BAR (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useAdminAuth } from '../hooks/useAdminAuth';
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

  return (
    <>
      <View style={[styles.header, isMobile && styles.mobileHeader]}>
        {/* 1. Left Title / Menu Button on Mobile */}
        <View style={styles.titleContainer}>
          {isMobile && onOpenMenu && (
            <TouchableOpacity style={styles.menuBtn} onPress={onOpenMenu}>
              <Menu size={20} color="#0F172A" />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, isMobile && styles.mobileTitle]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* 2. Center Global Search Input (Hidden on narrow mobile) */}
        {!isMobile && (
          <View style={styles.searchContainer}>
            <Search size={16} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search... (Ctrl+K)"
              placeholderTextColor="#94A3B8"
            />
          </View>
        )}

        {/* 3. Right User Identity & Actions */}
        <View style={styles.rightSection}>
          {/* User Avatar & Info (Interactive Profile Trigger) */}
          <TouchableOpacity
            style={[styles.userProfileBtn, isMobile && styles.mobileUserProfileBtn]}
            onPress={handleProfileClick}
            activeOpacity={0.7}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            {!isMobile && (
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.userSubtext}>{displayRole}</Text>
              </View>
            )}
            <ChevronDown size={14} color="#94A3B8" style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          {/* Sign Out Button */}
          {!isMobile && (
            <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
              <LogOut size={15} color="#64748B" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Super Admin Profile Modal Fallback */}
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
  mobileHeader: {
    height: 56,
    paddingHorizontal: 12,
  },
  titleContainer: {
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  mobileTitle: {
    fontSize: 16,
    maxWidth: 160,
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
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mobileUserProfileBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669', // BooffIn Emerald
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    maxWidth: 140,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
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
    marginLeft: 4,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
