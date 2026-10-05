// ============================================================================
// BOOFFIN ADMIN PORTAL — ROOT COMPONENT & ROUTER COORDINATOR
// ============================================================================

import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ADMIN_COLORS, AdminNavKey } from '../lib/constants';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminLayoutShell } from '../components/AdminLayoutShell';
import { AdminAccessDenied } from '../components/AdminAccessDenied';
import { AdminLoginView } from './AdminLoginView';
import { AdminMfaView } from './AdminMfaView';

// 11 Core Console Views
import { AdminDashboardView } from './AdminDashboardView';
import { AdminSupportView } from './AdminSupportView';
import { AdminOpsChatView } from './AdminOpsChatView';
import { AdminUsersView } from './AdminUsersView';
import { AdminReportsView } from './AdminReportsView';
import { AdminModerationView } from './AdminModerationView';
import { AdminApprovalsView } from './AdminApprovalsView';
import { AdminTeamView } from './AdminTeamView';
import { AdminAuditLogsView } from './AdminAuditLogsView';
import { AdminSecurityView } from './AdminSecurityView';
import { AdminAnalyticsView } from './AdminAnalyticsView';
import { AdminSystemHealthView } from './AdminSystemHealthView';
import { AdminSettingsView } from './AdminSettingsView';

export const AdminPortalRoot: React.FC = () => {
  const {
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    isMfaRequired,
    isMfaVerified,
    hasEnrolledFactor,
    refreshSession,
    signOut,
  } = useAdminAuth();

  const [activeKey, setActiveKey] = useState<AdminNavKey>('dashboard');

  // 1. Loading State
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
      </View>
    );
  }

  // 2. Unauthenticated State -> Login View
  if (!isAuthenticated) {
    return <AdminLoginView onSuccess={refreshSession} />;
  }

  // 3. Authenticated but Unauthorized -> 403 Access Denied
  if (!isAdmin) {
    return (
      <AdminAccessDenied
        reason={error || 'Your account does not possess active administrative credentials.'}
        onRetry={refreshSession}
        onSignOut={signOut}
      />
    );
  }

  // 4. MFA Challenge / Enrollment Required (AAL2 check)
  if (isMfaRequired && !isMfaVerified) {
    return (
      <AdminMfaView
        hasEnrolledFactor={hasEnrolledFactor}
        onVerified={refreshSession}
        onCancel={signOut}
      />
    );
  }

  // 5. Authorized Admin Console Shell
  const renderActiveView = () => {
    switch (activeKey) {
      case 'dashboard':
        return <AdminDashboardView onNavigate={setActiveKey} />;
      case 'support':
        return <AdminSupportView />;
      case 'team-chat':
        return <AdminOpsChatView />;
      case 'users':
        return <AdminUsersView />;
      case 'reports':
        return <AdminReportsView />;
      case 'moderation':
        return <AdminModerationView />;
      case 'approvals':
        return <AdminApprovalsView />;
      case 'team':
        return <AdminTeamView />;
      case 'audit-logs':
        return <AdminAuditLogsView />;
      case 'security':
        return <AdminSecurityView />;
      case 'analytics':
        return <AdminAnalyticsView />;
      case 'system-health':
        return <AdminSystemHealthView />;
      case 'settings':
        return <AdminSettingsView />;
      default:
        return <AdminDashboardView />;
    }
  };

  return (
    <AdminLayoutShell activeKey={activeKey} onSelectKey={setActiveKey}>
      {renderActiveView()}
    </AdminLayoutShell>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
