// ============================================================================
// BOOFFIN ADMIN PORTAL — ADMIN TEAM MANAGEMENT VIEW (STAGE 2)
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminDataTable, ColumnDef } from '../components/AdminDataTable';
import { AdminBadge } from '../components/AdminBadge';
import { adminSecurityService } from '../services/adminSecurityService';
import { AdminMember } from '../types/roles';

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
    { key: 'user_id', header: 'Admin User ID', width: 220, render: (m) => (
      <Text style={styles.codeText}>{m.user_id}</Text>
    )},
    { key: 'role', header: 'Assigned Role', width: 140, render: (m) => (
      <AdminBadge
        label={m.role}
        variant={m.role === 'SUPER_ADMIN' ? 'emerald' : m.role === 'ADMIN' ? 'info' : 'warning'}
        size="sm"
      />
    )},
    { key: 'status', header: 'Membership Status', width: 130, render: (m) => (
      <AdminBadge
        label={m.status}
        variant={m.status === 'ACTIVE' ? 'emerald' : 'danger'}
        size="sm"
      />
    )},
    { key: 'created_at', header: 'Granted At', width: 130, render: (m) => (
      <Text style={styles.cellMuted}>{new Date(m.created_at).toLocaleDateString()}</Text>
    )},
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Administrative Staff & Roles</Text>
        <Text style={styles.headerSubtitle}>Authoritative data from public.admin_members table</Text>
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
        <AdminDataTable columns={columns} data={members} emptyMessage={errorMessage ? 'Data inaccessible due to authorization error.' : 'No admin members registered in database.'} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerInfo: {
    marginBottom: 16,
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
  codeText: {
    fontFamily: 'monospace',
    color: ADMIN_COLORS.textPrimary,
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
