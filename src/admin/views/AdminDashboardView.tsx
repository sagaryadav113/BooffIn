// ============================================================================
// BOOFFIN ADMIN PORTAL — DASHBOARD VIEW (STAGE 2 LIVE DATA WIRING)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminUserService } from '../services/adminUserService';
import { adminReportService } from '../services/adminReportService';
import { adminApprovalService } from '../services/adminApprovalService';
import { adminAuditService } from '../services/adminAuditService';
import { AdminUserProfile, AdminReport } from '../types/data';

export const AdminDashboardView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userCount, setUserCount] = useState<number>(0);
  const [pendingReportsCount, setPendingReportsCount] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [auditLogsCount, setAuditLogsCount] = useState<number>(0);

  const [recentUsers, setRecentUsers] = useState<AdminUserProfile[]>([]);
  const [pendingReports, setPendingReports] = useState<AdminReport[]>([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [
        totalUsers,
        totalPendingReports,
        totalPendingApprovals,
        totalAuditLogs,
        usersRes,
        reportsRes,
      ] = await Promise.all([
        adminUserService.getUserCount(),
        adminReportService.getPendingReportsCount(),
        adminApprovalService.getPendingApprovalsCount(),
        adminAuditService.getAuditLogsCount(),
        adminUserService.listUsers({ limit: 5 }),
        adminReportService.listReports({ status: 'PENDING', limit: 5 }),
      ]);

      if (usersRes.error) {
        setErrorMessage(`Users query notice: ${usersRes.error.message}`);
      }
      if (reportsRes.error && !usersRes.error) {
        setErrorMessage(`Reports query notice: ${reportsRes.error.message}`);
      }

      setUserCount(totalUsers);
      setPendingReportsCount(totalPendingReports);
      setPendingApprovalsCount(totalPendingApprovals);
      setAuditLogsCount(totalAuditLogs);
      setRecentUsers(usersRes.users);
      setPendingReports(reportsRes.reports);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load live dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const userColumns: ColumnDef<AdminUserProfile>[] = [
    { key: 'username', header: 'Username', width: 140, render: (u) => <Text style={styles.boldText}>@{u.username}</Text> },
    { key: 'display_name', header: 'Display Name', width: 160 },
    { key: 'is_orcid_verified', header: 'ORCID', width: 110, render: (u) => (
      <AdminBadge label={u.is_orcid_verified ? 'VERIFIED' : 'UNLINKED'} variant={u.is_orcid_verified ? 'emerald' : 'neutral'} size="sm" />
    )},
    { key: 'created_at', header: 'Joined', width: 120, render: (u) => <Text style={styles.cellMuted}>{new Date(u.created_at).toLocaleDateString()}</Text> },
  ];

  const reportColumns: ColumnDef<AdminReport>[] = [
    { key: 'reason', header: 'Violation Reason', width: 180, render: (r) => <Text style={styles.boldText}>{r.reason}</Text> },
    { key: 'status', header: 'Status', width: 110, render: (r) => (
      <AdminBadge label={r.status} variant={r.status === 'PENDING' ? 'warning' : 'neutral'} size="sm" />
    )},
    { key: 'created_at', header: 'Reported At', width: 140, render: (r) => <Text style={styles.cellMuted}>{new Date(r.created_at).toLocaleDateString()}</Text> },
  ];

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Live Environment Notice */}
      <View style={styles.envBanner}>
        <View style={styles.envLeft}>
          <AdminBadge label="ISOLATED TEST ENV" variant="warning" size="sm" />
          <Text style={styles.envText}>Connected to Supabase Test Instance</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadDashboardData}>
          <Text style={styles.refreshBtnText}>Refresh Metrics</Text>
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Top Stat Row (Real Counts) */}
      <View style={styles.statsRow}>
        <AdminStatCard
          label="Registered Profiles"
          value={userCount}
          subtext="Active research users in DB"
          variant="default"
        />
        <AdminStatCard
          label="Pending Reports"
          value={pendingReportsCount}
          subtext="Requires review"
          variant={pendingReportsCount > 0 ? 'warning' : 'emerald'}
        />
        <AdminStatCard
          label="Dual-Approval Queue"
          value={pendingApprovalsCount}
          subtext="High-risk pending actions"
          variant={pendingApprovalsCount > 0 ? 'warning' : 'default'}
        />
        <AdminStatCard
          label="Audit Events Logged"
          value={auditLogsCount}
          subtext="Immutable compliance records"
          variant="emerald"
        />
      </View>

      {/* Recent Users Table */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Research Users</Text>
          <Text style={styles.sectionSubtitle}>Authoritative data from public.profiles</Text>
        </View>
        <AdminDataTable columns={userColumns} data={recentUsers} emptyMessage="No users registered in test database." />
      </View>

      {/* Pending Reports Table */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Moderation Reports</Text>
          <Text style={styles.sectionSubtitle}>Authoritative data from public.reports</Text>
        </View>
        <AdminDataTable columns={reportColumns} data={pendingReports} emptyMessage="No active pending reports in queue." />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  envBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  envLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  envText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  refreshBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  refreshBtnText: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: ADMIN_COLORS.danger,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  cellMuted: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
});
