// ============================================================================
// BOOFFIN ADMIN PORTAL — SETTINGS & COMPLIANCE CONFIGURATION VIEW
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ADMIN_COLORS, ADMIN_RADII } from '../lib/constants';
import { AdminBadge } from '../components/AdminBadge';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Database, ShieldCheck, UserCheck, Layers } from 'lucide-react-native';

export const AdminSettingsView: React.FC = () => {
  const { email, role, aal } = useAdminAuth();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.pageTitle}>Platform Settings & Environment</Text>
        <Text style={styles.pageSubtitle}>
          Backend architecture parameters, compliance policies, and authenticated session scope
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Database size={15} color={ADMIN_COLORS.emeraldPrimary} />
            <Text style={styles.cardTitle}>Backend Environment Configuration</Text>
          </View>
          <AdminBadge label="PRODUCTION" variant="emerald" size="sm" />
        </View>
        <Text style={styles.cardText}>
          Connected Cloud: BooffIn Production Supabase Cluster (<Text style={styles.mono}>lvstuqhrmagzqkgwlisl</Text>)
        </Text>
        <Text style={styles.cardSubtext}>
          Production Database Protection: Strict zero-trust RBAC and AAL2 TOTP validation active across all administrative endpoints.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <UserCheck size={15} color={ADMIN_COLORS.emeraldPrimary} />
            <Text style={styles.cardTitle}>Current Session Identity</Text>
          </View>
          <AdminBadge label={role || 'ADMIN'} variant="emerald" size="sm" />
        </View>
        <Text style={styles.cardText}>
          Authenticated Operator: {email || 'Unknown'}
        </Text>
        <Text style={styles.cardSubtext}>
          Authenticator Assurance Level: {aal ? aal.toUpperCase() : 'AAL1'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={15} color={ADMIN_COLORS.emeraldPrimary} />
            <Text style={styles.cardTitle}>Compliance & Immutability Rules</Text>
          </View>
          <AdminBadge label="ENFORCED" variant="emerald" size="sm" />
        </View>
        <Text style={styles.ruleItem}>
          • <Text style={styles.boldText}>Audit Trail:</Text> Strict append-only policy active on <Text style={styles.mono}>public.admin_audit_logs</Text> (Zero UPDATE / DELETE policies).
        </Text>
        <Text style={styles.ruleItem}>
          • <Text style={styles.boldText}>Two-Admin Rule:</Text> Check constraint <Text style={styles.mono}>chk_no_self_approval</Text> active on <Text style={styles.mono}>public.admin_approval_requests</Text>.
        </Text>
        <Text style={styles.ruleItem}>
          • <Text style={styles.boldText}>Terminal State Lock:</Text> Database state machine trigger <Text style={styles.mono}>trg_validate_approval_state_transition</Text> active.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.bgCanvas,
  },
  headerSection: {
    marginBottom: 16,
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
  card: {
    backgroundColor: ADMIN_COLORS.bgSurface,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    borderRadius: ADMIN_RADII.card,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cardText: {
    fontSize: 12,
    color: ADMIN_COLORS.textPrimary,
    lineHeight: 18,
  },
  cardSubtext: {
    fontSize: 11,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  ruleItem: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  boldText: {
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  mono: {
    fontFamily: 'monospace',
    color: ADMIN_COLORS.emeraldPrimary,
    fontSize: 11,
  },
});
