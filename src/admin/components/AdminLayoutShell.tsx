import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Modal, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS, AdminNavKey, ADMIN_NAV_ITEMS } from '../lib/constants';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import {
  LayoutDashboard,
  Calendar,
  MessagesSquare,
  LifeBuoy,
  Grid,
} from 'lucide-react-native';

interface AdminLayoutShellProps {
  activeKey: AdminNavKey;
  onSelectKey: (key: AdminNavKey) => void;
  children: React.ReactNode;
}

export const AdminLayoutShell: React.FC<AdminLayoutShellProps> = ({
  activeKey,
  onSelectKey,
  children,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const currentNav = ADMIN_NAV_ITEMS.find((item) => item.key === activeKey);
  const currentTitle = currentNav?.label ?? 'Console';

  const handleSelectNav = (key: AdminNavKey) => {
    onSelectKey(key);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const BOTTOM_TABS: { key: AdminNavKey | 'more'; label: string; icon: React.FC<any> }[] = [
    { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'team-chat', label: 'Comms', icon: MessagesSquare },
    { key: 'support', label: 'Support', icon: LifeBuoy },
    { key: 'more', label: 'Menu', icon: Grid },
  ];

  return (
    <View style={styles.container}>
      {/* Desktop Persistent Sidebar */}
      {!isMobile && <AdminSidebar activeKey={activeKey} onSelect={onSelectKey} />}

      {/* Mobile Slide-out Drawer */}
      {isMobile && (
        <Modal
          visible={mobileDrawerOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setMobileDrawerOpen(false)}
        >
          <View style={styles.drawerBackdrop}>
            <TouchableWithoutFeedback onPress={() => setMobileDrawerOpen(false)}>
              <View style={styles.backdropOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.drawerContent}>
              <AdminSidebar
                activeKey={activeKey}
                onSelect={handleSelectNav}
                onClose={() => setMobileDrawerOpen(false)}
                isMobileDrawer={true}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <AdminHeader
          title={currentTitle}
          isMobile={isMobile}
          onOpenMenu={() => setMobileDrawerOpen(true)}
        />
        <View style={[styles.viewContainer, isMobile && styles.mobileViewContainer]}>
          {children}
        </View>

        {/* Mobile App Bottom Tab Bar */}
        {isMobile && (
          <View style={styles.bottomTabBar}>
            {BOTTOM_TABS.map((tab) => {
              const IconComp = tab.icon;
              const isTabActive = tab.key === 'more' ? mobileDrawerOpen : activeKey === tab.key;

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.bottomTabItem}
                  onPress={() => {
                    if (tab.key === 'more') {
                      setMobileDrawerOpen(true);
                    } else {
                      handleSelectNav(tab.key as AdminNavKey);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bottomTabIconBox, isTabActive && styles.bottomTabIconBoxActive]}>
                    <IconComp
                      size={20}
                      color={isTabActive ? '#059669' : '#64748B'}
                      strokeWidth={isTabActive ? 2.4 : 1.8}
                    />
                  </View>
                  <Text style={[styles.bottomTabLabel, isTabActive && styles.bottomTabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    width: '100%',
    height: '100%',
    minHeight: '100vh' as any,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
    height: '100%',
    overflow: 'hidden',
  },
  viewContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  mobileViewContainer: {
    padding: 16,
    paddingBottom: 76, // Safe space for bottom tab bar
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 90,
  },
  bottomTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  bottomTabIconBox: {
    padding: 4,
    borderRadius: 12,
  },
  bottomTabIconBoxActive: {
    backgroundColor: '#ECFDF5',
  },
  bottomTabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  bottomTabLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
  drawerBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    zIndex: 9999,
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerContent: {
    width: 280,
    maxWidth: '85%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 10000,
  },
});

