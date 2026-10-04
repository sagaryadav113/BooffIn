// ============================================================================
// BOOFFIN ADMIN PORTAL — IMMUTABLE AUDIT LOGS VIEW (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminAuditService } from '../services/adminAuditService';
import { AdminAuditLog } from '../types/audit';
import { FileText, RefreshCw, ShieldCheck, Lock } from 'lucide-react-native';

export const AdminAuditLogsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminAuditService.listAuditLogs({ limit: 50 });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setLogs([]);
    } else {
      setLogs(res.logs);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const columns: ColumnDef<AdminAuditLog>[] = [
    {
      key: 'action',
      header: 'Audit Action',
      width: 190,
      render: (l) => <Text style={styles.boldText}>{l.action}</Text>,
    },
    {
      key: 'actor_role',
      header: 'Actor Role',
      width: 140,
      render: (l) => <AdminBadge label={l.actor_role} variant="emerald" size="sm" />,
    },
    {
      key: 'target_type',
      header: 'Target Resource',
      width: 140,
      render: (l) => <Text style={styles.cellText}>{l.target_type}</Text>,
    },
    {
      key: 'reason',
      header: 'Compliance Justification',
      width: 280,
      render: (l) => (
        <Text style={styles.cellSecondary} numberOfLines={2}>
          {l.reason || '—'}
        </Text>
      ),
    },
    {
      key: 'success',
      header: 'Result',
      width: 110,
      render: (l) => (
        <AdminBadge
          label={l.success ? 'SUCCESS' : 'FAILED'}
          variant={l.success ? 'emerald' : 'danger'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      width: 160,
      render: (l) => (
        <Text style={styles.cellMuted}>
          {new Date(l.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Immutable Compliance Audit Trail</Text>
          <Text style={styles.pageSubtitle}>Authoritative append-only log from public.admin_audit_logs ({logs.length} events)</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadAuditLogs}>
          <RefreshCw size={14} color="#475569" />
          <Text style={styles.refreshBtnText}>Refresh Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Compliance Notice Banner */}
      <View style={styles.complianceBanner}>
        <View style={styles.bannerIconBox}>
          <ShieldCheck size={18} color="#059669" />
        </View>
        <View style={styles.bannerTextGroup}>
          <Text style={styles.bannerTitle}>Cryptographically Protected & Immutable</Text>
          <Text style={styles.bannerSubtitle}>
            Zero UPDATE or DELETE policies exist on this table. Every administrative operation is permanently recorded with actor binding.
          </Text>
        </View>
      </View>

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
            data={logs}
            emptyMessage="No audit logs recorded in database."
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
  complianceBanner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
  cellSecondary: {
    fontSize: 12,
    color: '#475569',
  },
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
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
