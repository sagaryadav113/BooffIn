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
          <AdminBadge label="PRODUCTION" variant="emerald" size="sm" />
        </View>
        <Text style={styles.cardText}>
          Connected Backend: BooffIn Production Supabase (`lvstuqhrmagzqkgwlisl`)
        </Text>
        <Text style={styles.cardSubtext}>
          Production Database Protection: Strict zero-trust RBAC and AAL2 TOTP validation active on all administrative endpoints.
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
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  cardText: {
    fontSize: 13,
    color: ADMIN_COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
});

