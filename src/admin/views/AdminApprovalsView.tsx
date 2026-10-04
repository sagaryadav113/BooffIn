// ============================================================================
// BOOFFIN ADMIN PORTAL — DUAL-APPROVAL QUEUE VIEW (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminApprovalService } from '../services/adminApprovalService';
import { AdminApprovalRequest } from '../types/approvals';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { ShieldAlert, CheckSquare, RefreshCw, CheckCircle2, XCircle } from 'lucide-react-native';

export const AdminApprovalsView: React.FC = () => {
  const { role, userId } = useAdminAuth();
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

  const handleDecision = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionSuccessMessage(null);
    setErrorMessage(null);

    const res = status === 'APPROVED' 
      ? await adminApprovalService.approveRequest(requestId)
      : await adminApprovalService.rejectRequest(requestId, 'Super Admin decision marked as REJECTED');

    if (res.error) {
      setErrorMessage(`Dual Approval Engine: ${res.error.message}`);
    } else {
      setActionSuccessMessage(`Request successfully updated to ${status}.`);
      loadRequests();
    }
  };

  const columns: ColumnDef<AdminApprovalRequest>[] = [
    {
      key: 'action_type',
      header: 'Operation Type',
      width: 170,
      render: (r) => <Text style={styles.boldText}>{r.action_type}</Text>,
    },
    {
      key: 'reason',
      header: 'Justification / Reason',
      width: 250,
      render: (r) => (
        <Text style={styles.cellText} numberOfLines={2}>
          {r.reason || 'Administrative action'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: 'Approval Status',
      width: 130,
      render: (r) => (
        <AdminBadge
          label={r.status}
          variant={
            r.status === 'PENDING'
              ? 'warning'
              : r.status === 'APPROVED' || r.status === 'EXECUTED'
              ? 'emerald'
              : 'danger'
          }
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Requested Date',
      width: 140,
      render: (r) => (
        <Text style={styles.cellMuted}>
          {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 170,
      render: (r) => {
        if (r.status !== 'PENDING') {
          return <Text style={styles.cellMuted}>Completed</Text>;
        }

        const isSelf = r.requested_by === userId;
        if (isSelf) {
          return (
            <View style={styles.selfPill}>
              <Text style={styles.selfPillText}>Self-Request (Wait 2nd Admin)</Text>
            </View>
          );
        }

        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleDecision(r.id, 'APPROVED')}
            >
              <CheckCircle2 size={13} color="#03543F" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleDecision(r.id, 'REJECTED')}
            >
              <XCircle size={13} color="#991B1B" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        );
      },
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Dual-Approval Workflow</Text>
          <Text style={styles.pageSubtitle}>High-risk operations protected by PostgreSQL chk_no_self_approval</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={loadRequests}>
          <RefreshCw size={14} color="#475569" />
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Protocol Banner */}
      <View style={styles.protocolBanner}>
        <View style={styles.protocolIcon}>
          <ShieldAlert size={18} color="#059669" />
        </View>
        <View style={styles.protocolTextGroup}>
          <Text style={styles.protocolTitle}>Mandatory Two-Admin Protocol Enforced</Text>
          <Text style={styles.protocolSubtitle}>
            Critical actions (user permanent deletion, role elevation, security reconfiguration) require independent sign-off.
          </Text>
        </View>
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
            data={requests}
            emptyMessage="No pending dual-approval requests in queue. System operations are in compliance."
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
  protocolBanner: {
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
  protocolIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolTextGroup: {
    flex: 1,
  },
  protocolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  protocolSubtitle: {
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
  cellMuted: {
    fontSize: 12,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  approveBtn: {
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
  approveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rejectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  selfPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selfPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
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
