import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, Modal, TouchableWithoutFeedback } from 'react-native';
import { ADMIN_COLORS, AdminNavKey, ADMIN_NAV_ITEMS } from '../lib/constants';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

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
    padding: 12,
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
