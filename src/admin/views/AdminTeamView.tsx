// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN TEAM MANAGEMENT VIEW (LIGHT SAAS METIS STYLE)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminSecurityService } from '../services/adminSecurityService';
import { AdminMember } from '../types/roles';
import { UserCheck, UserPlus, RefreshCw, Shield } from 'lucide-react-native';

export const AdminTeamView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const res = await adminSecurityService.listAdminMembers();
    if (res.error) {
      setErrorMessage(`Authorization / Query Error: ${res.error.message}`);
      setMembers([]);
    } else {
      setMembers(res.members);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const columns: ColumnDef<AdminMember>[] = [
    {
      key: 'user_id',
      header: 'Admin Identifier',
      width: 280,
      render: (m) => (
        <View style={styles.memberCell}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>SA</Text>
          </View>
          <View>
            <Text style={styles.codeText}>{m.user_id}</Text>
            <Text style={styles.memberRoleLabel}>Primary Administrator</Text>
          </View>
        </View>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      width: 160,
      render: (m) => (
        <AdminBadge
          label={m.role}
          variant={m.role === 'SUPER_ADMIN' ? 'emerald' : m.role === 'ADMIN' ? 'info' : 'warning'}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      render: (m) => (
        <AdminBadge
          label={m.status}
          variant={m.status === 'ACTIVE' ? 'emerald' : 'danger'}
          size="sm"
        />
      ),
    },
    {
      key: 'created_at',
      header: 'Access Granted Date',
      width: 160,
      render: (m) => (
        <Text style={styles.cellMuted}>
          {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      ),
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.pageTitle}>Administrative Team</Text>
          <Text style={styles.pageSubtitle}>Privileged accounts in public.admin_members ({members.length} active)</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.inviteBtn}>
            <UserPlus size={15} color="#FFFFFF" />
            <Text style={styles.inviteBtnText}>Invite Admin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadMembers}>
            <RefreshCw size={14} color="#475569" />
          </TouchableOpacity>
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
            data={members}
            emptyMessage="No administrators configured in system."
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  inviteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
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
  memberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DEF7EC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#03543F',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberRoleLabel: {
    fontSize: 11,
    color: '#64748B',
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
