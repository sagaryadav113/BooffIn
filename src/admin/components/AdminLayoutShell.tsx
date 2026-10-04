// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN LAYOUT SHELL (LIGHT SAAS THEME)
// ============================================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
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
  const currentNav = ADMIN_NAV_ITEMS.find((item) => item.key === activeKey);
  const currentTitle = currentNav?.label ?? 'Console';

  return (
    <View style={styles.container}>
      <AdminSidebar activeKey={activeKey} onSelect={onSelectKey} />
      <View style={styles.mainContent}>
        <AdminHeader title={currentTitle} />
        <View style={styles.viewContainer}>{children}</View>
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
});
