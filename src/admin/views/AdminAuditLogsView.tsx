// ============================================================================
// BOOFFIN ADMIN PORTAL — IMMUTABLE COMPLIANCE AUDIT TRAIL
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  useWindowDimensions 
} from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminAuditService } from '../services/adminAuditService';
import { AdminAuditLog } from '../types/audit';
import { FileText, RefreshCw, ShieldCheck, Lock, AlertTriangle } from 'lucide-react-native';

export const AdminAuditLogsView: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
      header: 'AUDIT ACTION',
      width: 200,
      render: (l) => <Text style={styles.boldText} numberOfLines={1}>{l.action}</Text>,
    },
    {
      key: 'actor_role',
      header: 'ACTOR ROLE',
      width: 140,
      render: (l) => <AdminBadge label={l.actor_role} variant="emerald" size="sm" />,
    },
    {
      key: 'target_type',
      header: 'TARGET RESOURCE',
      width: 140,
      render: (l) => <Text style={styles.cellText}>{l.target_type}</Text>,
    },
    {
      key: 'reason',
      header: 'COMPLIANCE JUSTIFICATION',
      width: 260,
      render: (l) => (
        <Text style={styles.cellSecondary} numberOfLines={2}>
          {l.reason || '—'}
        </Text>
      ),
    },
    {
      key: 'success',
      header: 'RESULT',
      width: 100,
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
      header: 'TIMESTAMP',
      width: 150,
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
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.pageTitle}>Immutable Compliance Audit Trail</Text>
          <Text style={styles.pageSubtitle}>
            Cryptographically sealed activity log from public.admin_audit_logs ({logs.length} events recorded)
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshIconBtn} onPress={loadAuditLogs}>
          <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Compliance Notice Banner */}
      <View style={styles.complianceBanner}>
        <ShieldCheck size={16} color={ADMIN_COLORS.emeraldPrimary} />
        <View style={styles.bannerTextGroup}>
          <Text style={styles.bannerTitle}>Cryptographically Protected & Append-Only</Text>
          <Text style={styles.bannerSubtitle}>
            Zero UPDATE or DELETE policies exist on this audit table. Every operator action is permanently recorded with actor identity binding.
          </Text>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertTriangle size={15} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Verifying audit ledger...</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.mobileListContainer}>
          {logs.map((l) => (
            <View key={l.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.boldText}>{l.action}</Text>
                <AdminBadge
                  label={l.success ? 'SUCCESS' : 'FAILED'}
                  variant={l.success ? 'emerald' : 'danger'}
                  size="sm"
                />
              </View>

              <Text style={styles.cellSecondary}>Target: {l.target_type} • Role: {l.actor_role}</Text>
              {l.reason && <Text style={styles.cellMuted}>{l.reason}</Text>}

              <View style={styles.recordFooter}>
                <Text style={styles.cellMuted}>
                  {new Date(l.created_at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.tableWrapper}>
          <AdminDataTable
            columns={columns}
            data={logs}
            emptyMessage="No audit logs recorded in database."
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
  },
  refreshIconBtn: {
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    backgroundColor: ADMIN_COLORS.bgSurface,
    padding: 7,
    borderRadius: ADMIN_RADII.button,
  },
  complianceBanner: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: ADMIN_COLORS.emeraldPrimary,
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ADMIN_COLORS.statusDangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.statusDangerBorder,
    borderRadius: ADMIN_RADII.card,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: ADMIN_COLORS.statusDangerText,
    fontWeight: '500',
  },
  loadingCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
  },
  tableWrapper: {
    marginBottom: 24,
  },
  boldText: {
    fontSize: 12,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cellText: {
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
  },
  cellSecondary: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
  },
  cellMuted: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  mobileListContainer: {
    gap: 10,
    marginBottom: 24,
  },
  recordCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 12,
    gap: 6,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.borderSubtle,
    paddingTop: 6,
    marginTop: 2,
  },
});
