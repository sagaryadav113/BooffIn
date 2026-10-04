// ============================================================================
// BOOFFIN ADMIN PORTAL — REPORTS QUEUE VIEW (STAGE 2)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminReportService } from '../services/adminReportService';
import { AdminReport } from '../types/data';

export const AdminReportsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'RESOLVED' | undefined>('PENDING');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadReports = useCallback(async (status?: string) => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminReportService.listReports({ status });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setReports([]);
    } else {
      setReports(res.reports);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports(statusFilter);
  }, [statusFilter, loadReports]);

  const handleResolve = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    setActionSuccessMessage(null);
    setErrorMessage(null);

    const res = await adminReportService.resolveReport(reportId, status);
    if (res.error) {
      setErrorMessage(`Failed to update report: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Report ${reportId.slice(0, 8)}... successfully marked as ${status}.`);
      loadReports(statusFilter);
    }
  };

  const columns: ColumnDef<AdminReport>[] = [
    { key: 'reason', header: 'Violation Reason', width: 160, render: (r) => (
      <Text style={styles.boldText}>{r.reason}</Text>
    )},
    { key: 'details', header: 'Details / Description', width: 220, render: (r) => (
      <Text style={styles.cellText} numberOfLines={2}>{r.details || 'No additional details provided.'}</Text>
    )},
    { key: 'status', header: 'Status', width: 110, render: (r) => (
      <AdminBadge
        label={r.status}
        variant={r.status === 'PENDING' ? 'warning' : 'emerald'}
        size="sm"
      />
    )},
    { key: 'created_at', header: 'Submitted At', width: 130, render: (r) => (
      <Text style={styles.cellMuted}>{new Date(r.created_at).toLocaleDateString()}</Text>
    )},
    { key: 'actions', header: 'Actions', width: 180, render: (r) => (
      <View style={styles.actionRow}>
        {r.status === 'PENDING' ? (
          <>
            <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolve(r.id, 'RESOLVED')}>
              <Text style={styles.resolveBtnText}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={() => handleResolve(r.id, 'DISMISSED')}>
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.cellMuted}>Archived ({r.status})</Text>
        )}
      </View>
    )},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, statusFilter === 'PENDING' && styles.tabActive]}
          onPress={() => setStatusFilter('PENDING')}
        >
          <Text style={[styles.tabText, statusFilter === 'PENDING' && styles.tabTextActive]}>
            Pending Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, statusFilter === 'RESOLVED' && styles.tabActive]}
          onPress={() => setStatusFilter('RESOLVED')}
        >
          <Text style={[styles.tabText, statusFilter === 'RESOLVED' && styles.tabTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, statusFilter === undefined && styles.tabActive]}
          onPress={() => setStatusFilter(undefined)}
        >
          <Text style={[styles.tabText, statusFilter === undefined && styles.tabTextActive]}>
            All Reports
          </Text>
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {actionSuccessMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      ) : null}

      {/* Header Info */}
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>User & Content Reports</Text>
        <Text style={styles.headerSubtitle}>Authoritative data from public.reports table</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
        </View>
      ) : (
        <AdminDataTable columns={columns} data={reports} emptyMessage={errorMessage ? 'Data inaccessible due to authorization error.' : 'No reports matching filter.'} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
  },
  tabActive: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderColor: ADMIN_COLORS.emeraldPrimary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: ADMIN_COLORS.textSecondary,
  },
  tabTextActive: {
    color: ADMIN_COLORS.textPrimary,
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
  successBox: {
    backgroundColor: ADMIN_COLORS.emeraldBg,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  successText: {
    color: ADMIN_COLORS.emeraldLight,
    fontSize: 12,
    fontWeight: '600',
  },
  headerInfo: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  cellText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
  },
  cellMuted: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  resolveBtn: {
    backgroundColor: ADMIN_COLORS.emeraldBg,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resolveBtnText: {
    color: ADMIN_COLORS.emeraldLight,
    fontSize: 11,
    fontWeight: '600',
  },
  dismissBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderColor: ADMIN_COLORS.borderStrong,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dismissBtnText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
});
