import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname, router } from 'expo-router';
import {
  Home,
  Compass,
  Users,
  Bookmark,
  UserCheck,
  Mail,
  Bell,
  User,
  FileText,
  Settings,
  HelpCircle,
  Download,
  Layers,
} from 'lucide-react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from '../modals/InstallAppModal';

interface DesktopLeftSidebarProps {
  onOpenMessages?: () => void;
}

export const DesktopLeftSidebar: React.FC<DesktopLeftSidebarProps> = ({
  onOpenMessages,
}) => {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const workspaceUnread = useWorkspaceStore((s) => s.unreadTotal);
  const currentUser = useAuthStore((s) => s.user);
  const { hasNativePrompt, promptInstall } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleInstallPress = async () => {
    if (hasNativePrompt) {
      const installed = await promptInstall();
      if (!installed) {
        setShowInstallModal(true);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const isHomeActive = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  const isExploreActive = pathname.includes('explore');
  const isWorkspaceActive = pathname.includes('workspace');
  const isTopicsActive = pathname.includes('topic');
  const isNotificationsActive = pathname.includes('notifications');
  const isProfileActive = pathname.includes('profile');
  const isSettingsActive = pathname.includes('settings');

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      isActive: isHomeActive,
      onPress: () => router.push('/(tabs)'),
    },
    {
      id: 'explore',
      label: 'Explore',
      icon: Compass,
      isActive: isExploreActive,
      onPress: () => router.push('/(tabs)/explore'),
    },
    {
      id: 'workspace',
      label: 'Workspace',
      icon: Layers,
      badge: workspaceUnread,
      isActive: isWorkspaceActive,
      onPress: () => router.push('/workspace' as any),
    },
    {
      id: 'researchers',
      label: 'Researchers',
      icon: Users,
      isActive: pathname.includes('search') && pathname.includes('researcher'),
      onPress: () => router.push('/search?tab=researchers'),
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: Bookmark,
      isActive: false,
      onPress: () => router.push('/(tabs)/profile?tab=Saved'),
    },
    {
      id: 'following',
      label: 'Following',
      icon: UserCheck,
      isActive: false,
      onPress: () => router.push('/(tabs)?tab=Following'),
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: Mail,
      isActive: false,
      onPress: () => {
        if (onOpenMessages) {
          onOpenMessages();
        } else {
          router.push('/workspace' as any);
        }
      },
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount,
      isActive: isNotificationsActive,
      onPress: () => router.push('/(tabs)/notifications'),
    },
  ];

  const myResearchItems = [
    {
      id: 'my-profile',
      label: 'My Profile',
      icon: User,
      isActive: isProfileActive,
      onPress: () => router.push('/(tabs)/profile'),
    },
    {
      id: 'my-articles',
      label: 'My Articles',
      icon: FileText,
      isActive: false,
      onPress: () => router.push('/(tabs)/profile?tab=Articles'),
    },
  ];

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        position: 'sticky',
        top: 68,
        height: 'calc(100vh - 68px)',
        alignSelf: 'flex-start',
        overflowY: 'auto',
      }}
    >
      <View style={styles.container}>
        {/* Main Navigation Group */}
        <View style={styles.navGroup}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={item.onPress}
                style={[styles.navItem, item.isActive && styles.navItemActive]}
              >
                <IconComponent
                  size={19}
                  color={item.isActive ? '#064E3B' : '#475569'}
                  strokeWidth={item.isActive ? 2.4 : 2}
                />
                <Text
                  style={[
                    styles.navLabel,
                    item.isActive && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>

                {item.badge !== undefined && item.badge > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* MY RESEARCH Section */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionHeader}>MY RESEARCH</Text>
        <View style={styles.navGroup}>
          {myResearchItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={item.onPress}
                style={[styles.navItem, item.isActive && styles.navItemActive]}
              >
                <IconComponent
                  size={18}
                  color={item.isActive ? '#064E3B' : '#475569'}
                  strokeWidth={item.isActive ? 2.4 : 2}
                />
                <Text
                  style={[
                    styles.navLabel,
                    item.isActive && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Install App, Settings & Help */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleInstallPress}
            style={styles.navItem}
          >
            <Download size={18} color="#475569" strokeWidth={2} />
            <Text style={styles.navLabel}>Install App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/settings')}
            style={[styles.navItem, isSettingsActive && styles.navItemActive]}
          >
            <Settings
              size={18}
              color={isSettingsActive ? '#064E3B' : '#475569'}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.navLabel,
                isSettingsActive && styles.navLabelActive,
              ]}
            >
              Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/settings/help')}
            style={styles.navItem}
          >
            <HelpCircle size={18} color="#475569" strokeWidth={2} />
            <Text style={styles.navLabel}>Help & Safety</Text>
          </TouchableOpacity>
        </View>

        {/* Install Modal Popup */}
        <InstallAppModal
          visible={showInstallModal}
          onClose={() => setShowInstallModal(false)}
        />
      </View>
    </aside>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  navGroup: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#EAF3EE',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    flex: 1,
  },
  navLabelActive: {
    color: '#064E3B',
    fontWeight: '700',
  },
  navBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#94A3B8',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  bottomSection: {
    marginTop: 'auto' as any,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
});
