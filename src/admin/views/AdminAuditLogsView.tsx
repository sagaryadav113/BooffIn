// ============================================================================
// BOOFFIN ADMIN PORTAL — IMMUTABLE AUDIT LOGS VIEW (STAGE 2)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminAuditService } from '../services/adminAuditService';
import { AdminAuditLog } from '../types/audit';

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
    { key: 'action', header: 'Action Executed', width: 180, render: (l) => (
      <Text style={styles.boldText}>{l.action}</Text>
    )},
    { key: 'actor_role', header: 'Actor Role', width: 130, render: (l) => (
      <AdminBadge label={l.actor_role} variant="emerald" size="sm" />
    )},
    { key: 'target_type', header: 'Target Type', width: 120, render: (l) => (
      <Text style={styles.cellText}>{l.target_type}</Text>
    )},
    { key: 'reason', header: 'Justification / Reason', width: 220, render: (l) => (
      <Text style={styles.cellSecondary} numberOfLines={2}>{l.reason || '—'}</Text>
    )},
    { key: 'success', header: 'Result', width: 100, render: (l) => (
      <AdminBadge
        label={l.success ? 'SUCCESS' : 'FAILED'}
        variant={l.success ? 'emerald' : 'danger'}
        size="sm"
      />
    )},
    { key: 'created_at', header: 'Timestamp', width: 160, render: (l) => (
      <Text style={styles.cellMuted}>{new Date(l.created_at).toLocaleString()}</Text>
    )},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Immutable Audit Trail</Text>
          <Text style={styles.headerSubtitle}>
            Append-only compliance log from public.admin_audit_logs (Protected against mutation & deletion)
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadAuditLogs}>
          <Text style={styles.refreshBtnText}>Refresh Trail</Text>
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
        </View>
      ) : (
        <AdminDataTable columns={columns} data={logs} emptyMessage={errorMessage ? 'Data inaccessible due to authorization error.' : 'No audit logs recorded yet in database.'} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
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
  refreshBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 12,
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
  boldText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
    fontSize: 13,
  },
  cellText: {
    color: ADMIN_COLORS.textPrimary,
    fontSize: 12,
  },
  cellSecondary: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 12,
  },
  cellMuted: {
    color: ADMIN_COLORS.textMuted,
    fontSize: 12,
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
});
