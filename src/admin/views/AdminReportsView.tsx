// ============================================================================
// BOOFFIN ADMIN PORTAL — REPORTS QUEUE VIEW (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminReportService } from '../services/adminReportService';
import { AdminReport } from '../types/data';
import { CheckCircle2, XCircle, Flag, RefreshCw } from 'lucide-react-native';

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
      setActionSuccessMessage(`Report successfully marked as ${status}.`);
      loadReports(statusFilter);
    }
  };

  const columns: ColumnDef<AdminReport>[] = [
    {
      key: 'reason',
      header: 'Violation Reason',
      width: 180,
      render: (r) => <Text style={styles.boldText}>{r.reason}</Text>,
    },
    {
      key: 'details',
      header: 'Details / Context',
      width: 260,
      render: (r) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {r.details || 'No additional text description provided.'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      render: (r) => (
        <AdminBadge
          label={r.status}
          variant={r.status === 'PENDING' ? 'warning' : 'emerald'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Submitted At',
      width: 150,
      render: (r) => (
        <Text style={styles.cellMuted}>
          {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (r) =>
        r.status === 'PENDING' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.resolveBtn}
              onPress={() => handleResolve(r.id, 'RESOLVED')}
            >
              <CheckCircle2 size={13} color="#03543F" />
              <Text style={styles.resolveBtnText}>Resolve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => handleResolve(r.id, 'DISMISSED')}
            >
              <XCircle size={13} color="#475569" />
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.resolvedText}>— Resolved —</Text>
        ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>User & Content Reports</Text>
          <Text style={styles.pageSubtitle}>Authoritative data from public.content_reports</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadReports(statusFilter)}>
          <RefreshCw size={14} color="#475569" />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, statusFilter === 'PENDING' && styles.tabBtnActive]}
          onPress={() => setStatusFilter('PENDING')}
        >
          <Text style={[styles.tabBtnText, statusFilter === 'PENDING' && styles.tabBtnTextActive]}>
            Pending Review
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, statusFilter === 'RESOLVED' && styles.tabBtnActive]}
          onPress={() => setStatusFilter('RESOLVED')}
        >
          <Text style={[styles.tabBtnText, statusFilter === 'RESOLVED' && styles.tabBtnTextActive]}>
            Resolved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, statusFilter === undefined && styles.tabBtnActive]}
          onPress={() => setStatusFilter(undefined)}
        >
          <Text style={[styles.tabBtnText, statusFilter === undefined && styles.tabBtnTextActive]}>
            All Reports
          </Text>
        </TouchableOpacity>
      </View>

      {actionSuccessMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{actionSuccessMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Table Card */}
      <View style={styles.tableCard}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <AdminDataTable
            columns={columns}
            data={reports}
            emptyMessage={
              statusFilter === 'PENDING'
                ? 'No active pending moderation reports in queue. Platform is clean!'
                : 'No reports found.'
            }
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 20,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boldText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  resolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resolveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dismissBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  resolvedText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  successBox: {
    backgroundColor: '#DEF7EC',
    borderWidth: 1,
    borderColor: '#BCF0DA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  successText: {
    fontSize: 12,
    color: '#03543F',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
});
