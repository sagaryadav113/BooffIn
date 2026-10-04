// ============================================================================
// BOOFFIN ADMIN PORTAL — SECURITY & MFA STATUS VIEW (STAGE 3A)
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ADMIN_COLORS } from '../lib/constants';
import { AdminStatCard } from '../components/AdminStatCard';
import { AdminBadge } from '../components/AdminBadge';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { adminMfaService, MfaFactorSummary } from '../services/adminMfaService';

export const AdminSecurityView: React.FC = () => {
  const { role, status, aal, isMfaVerified, refreshSession } = useAdminAuth();
  const [factors, setFactors] = useState<MfaFactorSummary[]>([]);
  const [loadingFactors, setLoadingFactors] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadFactors = async () => {
    setLoadingFactors(true);
    setActionError(null);
    const { factors: list, error } = await adminMfaService.listFactors();
    if (error) {
      setActionError(error.message);
    } else {
      setFactors(list);
    }
    setLoadingFactors(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleUnenroll = async (factorId: string) => {
    setActionError(null);
    const { error } = await adminMfaService.unenrollFactor(factorId);
    if (error) {
      setActionError(error.message);
    } else {
      await loadFactors();
      await refreshSession();
    }
  };

  const protections = [
    { title: 'P0: Account Deletion (Hard Deletion)', status: 'ACTIVE', desc: 'Cascading purge of posts, comments, media via delete_user_account()' },
    { title: 'P0: Storage File Security & Bucket Isolation', status: 'ACTIVE', desc: 'Enforces user folder path ownership & avatar size limits' },
    { title: 'P0: Private Profile & Sensitive Field Shielding', status: 'ACTIVE', desc: 'Restricts email/settings and masks private profile counters' },
    { title: 'P1: Bidirectional Blocking Enforcement', status: 'ACTIVE', desc: 'Zero leak of posts, comments, and profile data between blocked parties' },
    { title: 'P1: Notification Actor Integrity', status: 'ACTIVE', desc: 'RLS policies block malicious notification spoofing' },
    { title: 'P2: Search Path Hardening (SECURITY DEFINER)', status: 'ACTIVE', desc: 'All functions locked to SET search_path = public, pg_temp' },
    { title: 'P2: Immutable Audit Log Constraints', status: 'ACTIVE', desc: 'Append-only table with zero UPDATE or DELETE permissions' },
    { title: 'P2: Dual-Admin No-Self-Approval', status: 'ACTIVE', desc: 'chk_no_self_approval prevents requester self-authorizing destructive actions' },
    { title: 'Stage 3A: Supabase TOTP MFA Engine', status: 'ENFORCED', desc: 'AAL2 token elevation with cryptographically verified RFC 6238 factors' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Stat Row */}
      <View style={styles.statsRow}>
        <AdminStatCard label="Security Baseline" value="P0 / P1 / P2" subtext="Preserved across all layers" variant="emerald" />
        <AdminStatCard
          label="MFA Assurance"
          value={aal === 'aal2' ? 'AAL2 Verified' : 'AAL1 Standard'}
          subtext={isMfaVerified ? 'Second Factor Authenticated' : 'Elevation Required'}
          variant={aal === 'aal2' ? 'emerald' : 'warning'}
        />
        <AdminStatCard label="Admin Role" value={role || 'UNKNOWN'} subtext={`Membership status: ${status || 'N/A'}`} variant="default" />
      </View>

      {/* MFA Factors Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Registered MFA Authentication Factors</Text>
            <Text style={styles.sectionSubtitle}>Active TOTP devices bound to your administrator account</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadFactors} disabled={loadingFactors}>
            <Text style={styles.refreshBtnText}>{loadingFactors ? 'Refreshing...' : 'Refresh Factors'}</Text>
          </TouchableOpacity>
        </View>

        {actionError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        )}

        {loadingFactors ? (
          <ActivityIndicator color={ADMIN_COLORS.emeraldPrimary} style={{ marginVertical: 16 }} />
        ) : factors.length === 0 ? (
          <View style={styles.emptyFactorCard}>
            <Text style={styles.emptyFactorText}>No registered MFA factors found. Complete MFA enrollment to enable AAL2.</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {factors.map((factor) => (
              <View key={factor.id} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <View style={styles.factorIdentity}>
                    <Text style={styles.factorType}>{factor.factorType.toUpperCase()}</Text>
                    <Text style={styles.factorName}>{factor.friendlyName || 'Authenticator Device'}</Text>
                  </View>
                  <View style={styles.factorActions}>
                    <AdminBadge label={factor.status.toUpperCase()} variant={factor.status === 'verified' ? 'emerald' : 'warning'} size="sm" />
                    <TouchableOpacity
                      style={styles.unenrollBtn}
                      onPress={() => handleUnenroll(factor.id)}
                    >
                      <Text style={styles.unenrollBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.factorMeta}>Factor ID: {factor.id.slice(0, 8)}... • Enrolled on {new Date(factor.createdAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Protections Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Platform Security Protections</Text>
        <Text style={styles.sectionSubtitle}>Verified zero-trust policies, database constraints, and cryptographic gates</Text>

        <View style={styles.cardList}>
          {protections.map((p, idx) => (
            <View key={idx} style={styles.protectionCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{p.title}</Text>
                <AdminBadge label={p.status} variant={p.status === 'ENFORCED' ? 'emerald' : 'neutral'} size="sm" />
              </View>
              <Text style={styles.cardDesc}>{p.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ADMIN_COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: ADMIN_COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 6,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: ADMIN_COLORS.textSecondary,
  },
  errorBox: {
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  errorText: {
    color: ADMIN_COLORS.danger,
    fontSize: 12,
  },
  emptyFactorCard: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  emptyFactorText: {
    fontSize: 12,
    color: ADMIN_COLORS.textMuted,
  },
  cardList: {
    gap: 12,
  },
  factorCard: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 16,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  factorIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorType: {
    fontSize: 11,
    fontWeight: '700',
    color: ADMIN_COLORS.emeraldLight,
    backgroundColor: ADMIN_COLORS.emeraldBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  factorName: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  factorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unenrollBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: ADMIN_COLORS.dangerBg,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.dangerBorder,
    borderRadius: 4,
  },
  unenrollBtnText: {
    color: ADMIN_COLORS.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  factorMeta: {
    fontSize: 11,
    color: ADMIN_COLORS.textMuted,
  },
  protectionCard: {
    backgroundColor: ADMIN_COLORS.bgCard,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.borderSubtle,
    borderRadius: 8,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ADMIN_COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: ADMIN_COLORS.textSecondary,
    lineHeight: 18,
  },
});
