import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Search,
  Bell,
  Plus,
  Compass,
  User,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Avatar } from '../core/Avatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';

interface DesktopHeaderProps {
  onSearch?: (query: string) => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ onSearch }) => {
  const currentUser = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Global ⌘K keyboard shortcut listener on web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('desktop-global-search-input');
        if (searchInput) {
          searchInput.focus();
        } else {
          router.push('/search');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchSubmit = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      if (onSearch) {
        onSearch(trimmed);
      } else {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    }
  };

  return (
    <header style={{ width: '100%', backgroundColor: '#FFFFFF', zIndex: 50 }}>
      <View style={styles.container}>
        {/* Left: Brand Logo & Tagline */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)')}
          style={styles.logoSection}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoIconBadge}>
              <Text style={styles.logoBadgeLetter}>B</Text>
            </View>
            <Text style={styles.brandTitle}>BooffIn</Text>
          </View>
          <Text style={styles.brandTagline}>research finds its people.</Text>
        </TouchableOpacity>

        {/* Center: Global Search Input with ⌘K */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" strokeWidth={2.2} />
          <TextInput
            nativeID="desktop-global-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search papers, researchers, topics, methods..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          <View style={styles.shortcutBadge}>
            <Text style={styles.shortcutText}>⌘K</Text>
          </View>
        </View>

        {/* Right: Quick Actions & Profile */}
        <View style={styles.rightActions}>
          {/* Create / Share Post Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/create')}
            style={styles.createBtn}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.createBtnText}>New Post</Text>
          </TouchableOpacity>

          {/* Notifications Bell */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/notifications')}
            style={styles.iconBtn}
          >
            <Bell size={20} color="#334155" strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar / Menu */}
          {isAuthenticated && currentUser ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.userProfileBtn}
            >
              <Avatar
                uri={currentUser.avatarUrl}
                name={currentUser.fullName || currentUser.handle || 'Researcher'}
                size="sm"
              />
              <View style={styles.userMeta}>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser.fullName || currentUser.handle}
                </Text>
                <Text style={styles.userHandle} numberOfLines={1}>
                  @{currentUser.handle || 'scholar'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(auth)/login')}
              style={styles.signInBtn}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </header>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    maxWidth: 1440,
    marginHorizontal: 'auto' as any,
    width: '100%',
  },
  logoSection: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeLetter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'serif',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#064E3B',
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 42,
    width: 480,
    maxWidth: '45%' as any,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10,
    fontSize: 14,
    color: '#0F172A',
    outlineStyle: 'none' as any,
  },
  shortcutBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userMeta: {
    maxWidth: 120,
  },
  userName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  userHandle: {
    fontSize: 11,
    color: '#64748B',
  },
  signInBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
