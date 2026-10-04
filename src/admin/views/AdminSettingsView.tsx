// ============================================================================
// BOOFFIN ADMIN PORTAL — SETTINGS & AUDIT CONFIGURATION VIEW (STAGE 2)
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminBadge } from '../components/AdminBadge';
import { useAdminAuth } from '../hooks/useAdminAuth';

export const AdminSettingsView: React.FC = () => {
  const { email, role, aal } = useAdminAuth();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Backend Environment Configuration</Text>
          <AdminBadge label="ISOLATED TEST" variant="warning" size="sm" />
        </View>
        <Text style={styles.cardText}>
          Connected Backend: BooffIn Test Supabase (Isolated Instance)
        </Text>
        <Text style={styles.cardSubtext}>
          Production Database Safety: All production databases and services are strictly READ-ONLY. Zero production mutation permitted.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Current Session Identity</Text>
          <AdminBadge label={role || 'ADMIN'} variant="emerald" size="sm" />
        </View>
        <Text style={styles.cardText}>
          Authenticated User: {email || 'Unknown'}
        </Text>
        <Text style={styles.cardSubtext}>
          Authenticator Assurance Level: {aal ? aal.toUpperCase() : 'AAL1'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Compliance & Immutability Rules</Text>
          <AdminBadge label="ENFORCED" variant="emerald" size="sm" />
        </View>
        <Text style={styles.cardText}>
          • Audit Trail: Strict append-only policy enabled on public.admin_audit_logs (Zero UPDATE / DELETE policies).
        </Text>
        <Text style={styles.cardText}>
          • Two-Admin Rule: Engine check constraint chk_no_self_approval active on public.admin_approval_requests.
        </Text>
        <Text style={styles.cardText}>
          • Terminal State Lock: State machine trigger trg_validate_approval_state_transition active.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 18,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  cardText: {
    fontSize: 13,
    color: ADMIN_COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
});
