// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN LAYOUT SHELL
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
    backgroundColor: ADMIN_COLORS.bgPrimary,
    width: '100%',
    height: '100%',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: ADMIN_COLORS.bgPrimary,
  },
  viewContainer: {
    flex: 1,
    padding: 20,
  },
});
