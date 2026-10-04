// ============================================================================
// BOOFFIN ADMIN PORTAL — DUAL-ADMIN APPROVALS VIEW (STAGE 2)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminApprovalService } from '../services/adminApprovalService';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminApprovalRequest } from '../types/approvals';

export const AdminApprovalsView: React.FC = () => {
  const { userId, role } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AdminApprovalRequest[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminApprovalService.listApprovalRequests({ limit: 50 });
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setRequests([]);
    } else {
      setRequests(res.requests);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (req: AdminApprovalRequest) => {
    setActionSuccessMessage(null);
    setErrorMessage(null);

    if (req.requested_by === userId) {
      setErrorMessage('Two-Admin Violation: You cannot approve a request you submitted.');
      return;
    }

    const res = await adminApprovalService.approveRequest(req.id);
    if (res.error) {
      setErrorMessage(`Approval Failed: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Approval granted for request ${req.id.slice(0, 8)}...`);
      loadRequests();
    }
  };

  const handleReject = async (req: AdminApprovalRequest) => {
    setActionSuccessMessage(null);
    setErrorMessage(null);

    const res = await adminApprovalService.rejectRequest(req.id, 'Administrative rejection');
    if (res.error) {
      setErrorMessage(`Rejection Failed: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Request ${req.id.slice(0, 8)}... successfully rejected.`);
      loadRequests();
    }
  };

  const columns: ColumnDef<AdminApprovalRequest>[] = [
    { key: 'action_type', header: 'Action Type', width: 170, render: (r) => (
      <Text style={styles.boldText}>{r.action_type}</Text>
    )},
    { key: 'reason', header: 'Justification Reason', width: 200, render: (r) => (
      <Text style={styles.cellText} numberOfLines={2}>{r.reason}</Text>
    )},
    { key: 'status', header: 'Status', width: 100, render: (r) => (
      <AdminBadge
        label={r.status}
        variant={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'emerald' : 'neutral'}
        size="sm"
      />
    )},
    { key: 'created_at', header: 'Requested At', width: 120, render: (r) => (
      <Text style={styles.cellMuted}>{new Date(r.created_at).toLocaleDateString()}</Text>
    )},
    { key: 'actions', header: 'Actions', width: 160, render: (r) => {
      const isSelf = r.requested_by === userId;
      const isSuperAdmin = role === 'SUPER_ADMIN';

      if (r.status !== 'PENDING') {
        return <Text style={styles.cellMuted}>Locked ({r.status})</Text>;
      }

      if (isSelf) {
        return <Text style={styles.cellNotice}>Awaiting 2nd Admin</Text>;
      }

      if (!isSuperAdmin) {
        return <Text style={styles.cellMuted}>Super Admin Only</Text>;
      }

      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(r)}>
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(r)}>
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      );
    }},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Informational Banner */}
      <View style={styles.ruleBanner}>
        <Text style={styles.ruleTitle}>Mandatory Two-Admin Approval Protocol (Stage 2 Verification)</Text>
        <Text style={styles.ruleDescription}>
          High-risk destructive operations require independent approval by a second Super Administrator. The database strictly enforces chk_no_self_approval.
        </Text>
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

      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Dual-Approval Queue</Text>
        <Text style={styles.headerSubtitle}>Authoritative data from public.admin_approval_requests</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.emeraldPrimary} />
        </View>
      ) : (
        <AdminDataTable columns={columns} data={requests} emptyMessage={errorMessage ? 'Data inaccessible due to authorization error.' : 'No active dual-approval requests in queue.'} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ruleBanner: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderLeftWidth: 4,
    borderLeftColor: ADMIN_COLORS.emeraldPrimary,
    padding: 16,
    borderRadius: 6,
    marginBottom: 20,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 18,
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
  cellNotice: {
    color: ADMIN_COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: {
    backgroundColor: ADMIN_COLORS.emeraldBg,
    borderColor: ADMIN_COLORS.emeraldBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  approveBtnText: {
    color: ADMIN_COLORS.emeraldLight,
    fontSize: 11,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: ADMIN_COLORS.bgHover,
    borderColor: ADMIN_COLORS.borderStrong,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rejectBtnText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  loader: {
    padding: 40,
    alignItems: 'center',
  },
});
