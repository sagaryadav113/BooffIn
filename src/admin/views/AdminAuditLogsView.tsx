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
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { adminAuditService } from '../services/adminAuditService';
import { AdminAuditLog } from '../types/audit';
import { RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react-native';

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
      key: 'created_at',
      header: 'TIMESTAMP',
      width: 140,
      render: (l) => (
        <Text style={styles.monoTime}>
          {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {' '}
          <Text style={styles.dateSub}>
            {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </Text>
      ),
    },
    {
      key: 'action',
      header: 'EVENT / ACTION',
      width: 190,
      render: (l) => <Text style={styles.monoAction} numberOfLines={1}>{l.action}</Text>,
    },
    {
      key: 'actor_role',
      header: 'ACTOR / ROLE',
      width: 130,
      render: (l) => (
        <Text style={styles.actorText}>{l.actor_role}</Text>
      ),
    },
    {
      key: 'target_type',
      header: 'TARGET RESOURCE',
      width: 140,
      render: (l) => <Text style={styles.monoTarget}>{l.target_type}</Text>,
    },
    {
      key: 'success',
      header: 'STATUS',
      width: 110,
      render: (l) => (
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, l.success ? styles.dotSuccess : styles.dotDanger]} />
          <Text style={[styles.statusLabel, l.success ? styles.textSuccess : styles.textDanger]}>
            {l.success ? 'SUCCESS' : 'FAILED'}
          </Text>
        </View>
      ),
    },
    {
      key: 'reason',
      header: 'DETAILS / PAYLOAD',
      width: 280,
      render: (l) => (
        <Text style={styles.cellDetails} numberOfLines={2}>
          {l.reason || '—'}
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
            Authoritative append-only log from public.admin_audit_logs ({logs.length} events)
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshIconBtn} onPress={loadAuditLogs} activeOpacity={0.7}>
          <RefreshCw size={13} color={ADMIN_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Compliance Notice Banner */}
      <View style={styles.complianceBanner}>
        <ShieldCheck size={15} color={ADMIN_COLORS.emeraldPrimary} style={{ marginTop: 1 }} />
        <View style={styles.bannerTextGroup}>
          <Text style={styles.bannerTitle}>Cryptographically Protected & Immutable</Text>
          <Text style={styles.bannerSubtitle}>
            Zero UPDATE or DELETE policies exist on this table. Every administrative operation is permanently recorded with actor binding.
          </Text>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBox}>
          <AlertTriangle size={15} color={ADMIN_COLORS.statusDangerText} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Main Content: Single Consolidated Feed on Mobile vs Dense Table on Desktop */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={ADMIN_COLORS.emeraldPrimary} />
          <Text style={styles.loadingText}>Verifying audit ledger...</Text>
        </View>
      ) : isMobile ? (
        <View style={styles.mobileTimelineCard}>
          {logs.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyTitle}>No audit events recorded</Text>
            </View>
          ) : (
            logs.map((l, idx) => (
              <View 
                key={l.id || idx} 
                style={[
                  styles.mobileTimelineRow,
                  idx < logs.length - 1 && styles.mobileTimelineDivider
                ]}
              >
                {/* Row 1: Event Action + Status Dot & Timestamp */}
                <View style={styles.mRow1}>
                  <View style={styles.mActionGroup}>
                    <View style={[styles.statusDot, l.success ? styles.dotSuccess : styles.dotDanger]} />
                    <Text style={styles.mActionText} numberOfLines={1}>{l.action}</Text>
                  </View>
                  <Text style={styles.mTimestamp}>
                    {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {new Date(l.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>

                {/* Row 2: Target & Actor */}
                <View style={styles.mRow2}>
                  <Text style={styles.mMetaText}>
                    Target: <Text style={styles.monoTargetSmall}>{l.target_type}</Text>
                    {' · '}
                    Actor: <Text style={styles.mActorText}>{l.actor_role}</Text>
                  </Text>
                </View>

                {/* Row 3 (Optional Details) */}
                {l.reason ? (
                  <Text style={styles.mDetailsText} numberOfLines={2}>
                    {l.reason}
                  </Text>
                ) : null}
              </View>
            ))
          )}
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
    borderRadius: 6,
  },
  complianceBanner: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
  monoTime: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textPrimary,
  },
  dateSub: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
  },
  monoAction: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  actorText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    fontWeight: '500',
  },
  monoTarget: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSuccess: {
    backgroundColor: '#10B981',
  },
  dotDanger: {
    backgroundColor: '#EF4444',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textSuccess: {
    color: '#047857',
  },
  textDanger: {
    color: '#B91C1C',
  },
  cellDetails: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 15,
  },
  // Mobile Timeline Styles
  mobileTimelineCard: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  mobileTimelineRow: {
    padding: 12,
    gap: 4,
  },
  mobileTimelineDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  mActionText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  mTimestamp: {
    fontSize: 10,
    color: ADMIN_COLORS.textMuted,
    fontFamily: 'monospace',
  },
  mRow2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mMetaText: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
  },
  monoTargetSmall: {
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '500',
  },
  mActorText: {
    color: ADMIN_COLORS.textPrimary,
    fontWeight: '500',
  },
  mDetailsText: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },
  emptyFeed: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
  },
});
